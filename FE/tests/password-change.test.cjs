const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { JSDOM } = require(process.env.JSDOM_MODULE || 'jsdom');
const { build } = require(process.env.ESBUILD_MODULE || 'esbuild');
const root = path.resolve(__dirname, '..');
const requireFE = Module.createRequire(path.join(root, 'package.json'));

test('password form validates, reports API errors, blocks duplicate requests and logs out after success', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/profile' });
  for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'Event']) global[key] = dom.window[key];
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const React = requireFE('react');
  const { act } = React;
  const { createRoot } = requireFE('react-dom/client');
  const { MemoryRouter, useLocation } = requireFE('react-router-dom');
  const output = await build({
    stdin: { contents: `export { default as ChangePasswordForm } from './src/features/profile/components/ChangePasswordForm'; export { AuthContext } from './src/context/AuthContext';`, resolveDir: root, loader: 'tsx' },
    bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', write: false,
    external: ['react', 'react-dom', 'react-router-dom'], loader: { '.css': 'empty' },
    plugins: [{ name: 'synthetic-api', setup(b) {
      b.onResolve({ filter: /(?:^|\/)config\/axios$/ }, () => ({ path: 'fixture-api', namespace: 'fixture' }));
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export default globalThis.passwordTestApi;' }));
    } }],
  });
  const compiled = new Module(path.join(root, 'password-dom-fixture.cjs'));
  compiled.filename = path.join(root, 'password-dom-fixture.cjs');
  compiled.paths = Module._nodeModulePaths(root);
  const writes = [];
  let fail = true, complete, location, logoutCount = 0;
  global.passwordTestApi = { async post(url, body) {
    writes.push({ url, body });
    if (fail) throw { isAxiosError: true, response: { data: { code: 40099, message: 'Mật khẩu hiện tại chưa đúng.' } } };
    await new Promise(resolve => { complete = resolve; });
    return { data: {} };
  } };
  compiled._compile(output.outputFiles[0].text, compiled.filename);
  const { ChangePasswordForm, AuthContext } = compiled.exports;
  function Probe() { location = useLocation(); return null; }
  const renderer = createRoot(document.getElementById('root'));
  const render = provider => React.createElement(MemoryRouter, { initialEntries: ['/profile'] },
    React.createElement(AuthContext.Provider, { value: { user: { authProvider: provider }, logout: async () => { logoutCount++; } } },
      React.createElement(ChangePasswordForm), React.createElement(Probe)));
  const click = async text => { await act(async () => [...document.querySelectorAll('button')].find(n => n.textContent === text).click()); };
  const fill = async (field, value) => { await act(async () => {
    const input = document.getElementById(`change-${field}`);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }); };
  const submit = async () => { await act(async () => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); };
  try {
    await act(async () => renderer.render(render('LOCAL')));
    await click('Đổi mật khẩu');
    await submit(); assert.equal(writes.length, 0);
    await fill('currentPassword', 'OldPassword123');
    await fill('newPassword', 'NewPassword456');
    await fill('confirmPassword', 'Mismatch123');
    await submit(); assert.equal(writes.length, 0); assert.match(document.body.textContent, /chưa khớp/);
    await fill('confirmPassword', 'NewPassword456');
    await submit(); assert.equal(writes.length, 1); assert.match(document.body.textContent, /hiện tại chưa đúng/);
    assert.equal(logoutCount, 0); assert.equal(location.pathname, '/profile');
    fail = false;
    await submit(); assert.equal(writes.length, 2);
    await submit(); assert.equal(writes.length, 2);
    assert.equal(document.querySelector('fieldset').disabled, true);
    await act(async () => complete());
    assert.equal(logoutCount, 1); assert.equal(location.pathname, '/login'); assert.equal(location.state.passwordChanged, true);
    assert.deepEqual(writes[1], { url: '/users/me/password', body: { currentPassword: 'OldPassword123', newPassword: 'NewPassword456' } });
    assert.equal(document.getElementById('change-newPassword').value, '');
    await act(async () => renderer.render(render('GOOGLE')));
    assert.match(document.body.textContent, /quản lý mật khẩu trong tài khoản Google/);
    assert.equal(document.querySelector('form'), null);
  } finally {
    await act(async () => renderer.unmount()); dom.window.close(); delete global.passwordTestApi;
  }
});
