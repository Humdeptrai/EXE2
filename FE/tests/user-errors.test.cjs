/* Run with ESBUILD_MODULE=/path/to/esbuild and JSDOM_MODULE=/path/to/jsdom:
 * node --test tests/user-errors.test.cjs
 * Tests use synthetic failures and never call production APIs.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const root = path.resolve(__dirname, '..');
const requireFE = Module.createRequire(path.join(root, 'package.json'));
const { build } = require(process.env.ESBUILD_MODULE || 'esbuild');

async function bundle(contents) {
  const result = await build({ stdin: { contents, resolveDir: root, loader: 'tsx' }, bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', write: false,
    external: ['react', 'react-dom', 'react-router-dom'], loader: { '.css': 'empty' }, define: { 'import.meta.env': '{}' } });
  const module = new Module(path.join(root, 'user-error-fixture.cjs'));
  module.filename = path.join(root, 'user-error-fixture.cjs'); module.paths = Module._nodeModulePaths(root);
  module._compile(result.outputFiles[0].text, module.filename);
  return module.exports;
}

test('every backend code has friendly copy; shared numbers preserve the specific business reason', async () => {
  const { errorMessages, friendlyApiMessage, friendlyText } = await bundle("export * from './src/utils/errorMessages';");
  const backend = fs.readFileSync(path.join(root, '../BE/src/main/java/com/handsfree/be/exception/ErrorCode.java'), 'utf8');
  const codes = [...backend.matchAll(/(\w+)\((\d+),\s*HttpStatus\.\w+,\s*"([^"]+)"\)/g)];
  assert.ok(codes.length, 'Backend error catalog must be readable');
  for (const [, key, value, message] of codes) {
    const code = Number(value);
    assert.ok(errorMessages[code] || [40961, 40914, 40071].includes(code), `Missing copy for ${key}`);
    const friendly = friendlyApiMessage({ code, message }, 'Không thể thực hiện thao tác.');
    assert.ok(friendly.length > 15, key);
    assert.doesNotMatch(friendly, /matching|refresh token|credential|\bADMIN\b|\bSTAFF\b/i, key);
    assert.equal(friendlyText(friendly), friendly, 'Formatting must be idempotent: ' + key);
  }
  const cases = [
    [40961, 'Hồ sơ đã thay đổi, vui lòng tải lại.', /Hồ sơ/],
    [40961, 'Đã hết hạn thanh toán; phí thực tế đã trả sẽ được hoàn về ví', /thanh toán/],
    [40914, 'Bài đã có lịch sử matching nên không thể xóa', /lịch sử kết nối/],
    [40914, 'Chỉ bài đã hoàn thành hoặc đã hủy mới có thể đăng lại', /đăng lại/],
    [40071, 'Tệp chat không hợp lệ. Ảnh tối đa 10 MB.', /10 MB/],
    [40071, 'Chỉ gửi tối đa 5 ảnh, mỗi ảnh 5 MB.', /5 MB/],
  ];
  for (const [code, message, expected] of cases) assert.match(friendlyApiMessage({ code, message }, 'Lỗi'), expected);
  assert.match(friendlyApiMessage({ code: 40903 }, 'Lỗi'), /Số điện thoại/);
  assert.match(friendlyApiMessage({ code: 40951 }, 'Lỗi'), /Số dư ví/);
  assert.match(friendlyApiMessage({ code: 40002, errors: { phone: 'Số điện thoại phải gồm 10 số.' } }, 'Lỗi'), /10 số/);
  assert.match(friendlyApiMessage({ code: 40002, errors: { count: 'must not be null' } }, 'Lỗi'), /Thông tin bạn nhập/);
  for (const raw of ['java.lang.Exception: select secret from users', '<html>Bad gateway</html>', '[object Object]', 'ERR_NETWORK']) {
    assert.doesNotMatch(friendlyApiMessage({ code: 99999, message: raw }, 'Vui lòng thử lại sau.'), /Exception|secret|html|Object|ERR_/);
  }
  assert.match(friendlyApiMessage(undefined, 'Lỗi', 502, '/payments/topups'), /không chuyển lại/);
});

test('closeable popups cover API, local/native validation and auth without duplicate dialogs or mutations', async () => {
  const { JSDOM } = require(process.env.JSDOM_MODULE || 'jsdom');
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/login', pretendToBeVisual: true });
  for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement', 'HTMLTextAreaElement', 'HTMLDialogElement', 'MutationObserver', 'Event', 'CustomEvent']) global[key] = dom.window[key];
  global.IS_REACT_ACT_ENVIRONMENT = true;
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); this.querySelector('[autofocus]')?.focus(); };
  dom.window.HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  const React = requireFE('react'), { act } = React;
  const { createRoot } = requireFE('react-dom/client');
  const { FeedbackProvider, FeedbackContext, UserNotice, getApiErrorMessage, getAuthError, reportUserError } = await bundle(`
    export {default as FeedbackProvider} from './src/components/feedback/FeedbackProvider';
    export {FeedbackContext} from './src/components/feedback/FeedbackContext';
    export {default as UserNotice} from './src/components/feedback/UserNotice';
    export {getApiErrorMessage} from './src/features/auth/utils/apiError';
    export {getAuthError} from './src/features/auth/utils/authError';
    export {reportUserError} from './src/utils/userErrors';`);
  let showInline, requestConfirmation, mutations = 0;
  function Content() {
    const [messages, setMessages] = React.useState([]);
    const feedback = React.useContext(FeedbackContext);
    showInline = setMessages;
    requestConfirmation = () => feedback.confirm({ title: 'Xóa địa chỉ?', message: 'Bạn có muốn xóa địa chỉ này?', confirmLabel: 'Xóa', danger: true }).then(accepted => { if (accepted) mutations++; });
    return React.createElement('main', null,
      React.createElement('form', null, React.createElement('label', null, 'Email', React.createElement('input', { id: 'email', type: 'email', required: true }))),
      messages.map(message => React.createElement(UserNotice, { key: message, error: true, message })));
  }
  const renderer = createRoot(document.getElementById('root'));
  const settle = async () => { for (let i = 0; i < 2; i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 60)); }); };
  const errors = () => [...document.querySelectorAll('[data-error-popup]')];
  const close = async via => {
    const dialog = errors()[0]; assert.ok(dialog);
    await act(async () => {
      if (via === 'escape') dialog.dispatchEvent(new Event('cancel', { cancelable: true }));
      else if (via === 'x') dialog.querySelector('[aria-label="Đóng thông báo"]').click();
      else [...dialog.querySelectorAll('button')].find(button => button.textContent === 'Đóng').click();
    });
    await settle();
    assert.equal(errors().length, 0);
  };
  const apiError = (code, url = '/users/me') => ({ isAxiosError: true, config: { url }, response: { status: 409, data: { code, message: 'java.lang.Exception: hidden detail' } } });
  try {
    await act(async () => renderer.render(React.createElement(FeedbackProvider, null, React.createElement(Content))));
    const input = document.getElementById('email'); input.focus();
    const source = apiError(40903);
    await act(async () => { const message = getApiErrorMessage(source, 'Không thể lưu.'); showInline([message]); });
    await settle();
    assert.equal(errors().length, 1);
    assert.match(errors()[0].textContent, /Số điện thoại đã được sử dụng/);
    assert.doesNotMatch(errors()[0].textContent, /40903|Exception/);
    await close('x');
    assert.equal(document.body.style.overflow, '');
    assert.equal(document.activeElement, input);
    // Polling stays silent after dismissal; a fresh user action can show the
    // same failure again without waiting for an arbitrary timeout.
    await act(async () => getApiErrorMessage(apiError(40903), 'Không thể lưu.'));
    await settle(); assert.equal(errors().length, 0);
    await act(async () => { input.click(); getApiErrorMessage(apiError(40903), 'Không thể lưu.'); });
    await settle(); await close('escape');

    await act(async () => { showInline([]); getApiErrorMessage({ __CANCEL__: true }, 'Không thể tải.'); });
    await settle(); assert.equal(errors().length, 0);
    await act(async () => { reportUserError('Vui lòng bổ sung họ tên.'); showInline(['Vui lòng bổ sung họ tên.', 'Vui lòng bổ sung số điện thoại.']); });
    await settle(); assert.equal(errors().length, 1);
    assert.match(errors()[0].textContent, /họ tên/); assert.match(errors()[0].textContent, /số điện thoại/);
    await close('button');
    assert.equal(document.querySelectorAll('[role="alert"]').length, 2, 'Closing does not erase inline guidance or form data');

    const retry = document.createElement('div'); retry.setAttribute('role', 'alert');
    const explanation = document.createElement('span'); explanation.textContent = 'Không gửi được tin nhắn. Vui lòng kiểm tra mạng.';
    const retryButton = document.createElement('button'); retryButton.textContent = 'Gửi lại'; retry.append(explanation, retryButton);
    await act(async () => { reportUserError(explanation.textContent); document.body.append(retry); });
    await settle();
    assert.equal(errors().length, 1);
    assert.equal(errors()[0].querySelector('p').textContent, explanation.textContent, 'Do not repeat the API error or copy retry controls into a popup');
    await close('button'); retry.remove();
    const success = document.createElement('p'); success.setAttribute('role', 'status'); success.textContent = 'Đã lưu thành công.';
    document.body.append(success); await settle(); assert.equal(errors().length, 0); success.remove();

    await act(async () => { showInline([]); }); await settle();
    await act(async () => input.checkValidity()); await settle();
    assert.match(errors()[0].textContent, /bổ sung email/i); await close('button');
    input.value = 'not-an-email';
    await act(async () => input.checkValidity()); await settle();
    assert.match(errors()[0].textContent, /Email chưa đúng định dạng/); await close('button');
    assert.equal(input.value, 'not-an-email');

    let decision;
    await act(async () => { decision = requestConfirmation(); });
    await act(async () => reportUserError('Không tải được dữ liệu. Vui lòng thử lại sau.'));
    await settle(); assert.equal(errors().length, 0, 'Do not stack errors over a business confirmation');
    const confirmation = document.querySelector('[role="dialog"]');
    await act(async () => [...confirmation.querySelectorAll('button')].find(button => button.textContent === 'Hủy').click());
    await decision; await settle(); assert.equal(errors().length, 1);
    await close('x'); assert.equal(mutations, 0);

    await act(async () => { const error = apiError(40102, '/auth/login'); getAuthError(error, 'Không đăng nhập được.'); });
    await settle(); assert.match(errors()[0].textContent, /mật khẩu không đúng/); await close('button');
    await act(async () => { window.dispatchEvent(new Event('handsfree:session-changed')); window.dispatchEvent(new Event('auth-session-expired')); });
    await settle(); assert.match(errors()[0].textContent, /Phiên đăng nhập đã hết hạn/); await close('button');
    await act(async () => { reportUserError('Tài khoản này cần kiểm tra lại danh tính.'); }); await settle();
    assert.equal(errors().length, 1);
    await act(async () => window.dispatchEvent(new Event('handsfree:session-changed'))); await settle();
    assert.equal(errors().length, 0, 'Old account errors must not carry into the next session');
  } finally {
    await act(async () => renderer.unmount()); dom.window.close();
  }
});
