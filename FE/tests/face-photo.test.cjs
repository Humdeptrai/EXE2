/* React DOM integration. Supply ESBUILD_MODULE and JSDOM_MODULE as in other tests.
 * All API calls and images below are synthetic; no production writes. */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { build } = require(process.env.ESBUILD_MODULE || 'esbuild');
const { JSDOM } = require(process.env.JSDOM_MODULE || 'jsdom');
const root = path.resolve(__dirname, '..'), requireFE = Module.createRequire(path.join(root, 'package.json'));

test('ADMIN toggle and photo-reference flow preserve camera-only defaults and manual review', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost', pretendToBeVisual: true });
  for (const key of ['window','document','HTMLElement','HTMLInputElement','HTMLCanvasElement','Event','CustomEvent','File','Blob','FormData','localStorage']) global[key] = dom.window[key];
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.IntersectionObserver = class { observe() {} disconnect() {} };
  global.createImageBitmap = async () => ({ width: 640, height: 480, close() {} });
  HTMLCanvasElement.prototype.getContext = () => ({ drawImage() {} });
  HTMLCanvasElement.prototype.toBlob = callback => callback(new Blob([new Uint8Array(6000)], { type: 'image/jpeg' }));
  let enabled = false, optionsFailed = false;
  let progress = { scanPassed: false, selfiePassed: false, frontPassed: false, backPassed: false, facePhotoUploaded: false, status: 'DRAFT', version: 0 };
  const calls = [];
  const settings = { consumerFee: 10000, providerFee: 5000, minTopUp: 10000, maxTopUp: 5000000, topUpEnabled: true, paymentWindowMinutes: 1440, ratingDelayMinutes: 360 };
  global.photoTestApi = {
    async get(url) {
      let result = [];
      if (url === '/identity/progress') result = progress;
      if (url === '/identity/progress/options') {
        if (optionsFailed) throw Error('synthetic unavailable');
        result = { facePhotoUploadEnabled: enabled, photoRequiresAdminReview: true };
      }
      if (url === '/identity/requests/latest') result = null;
      if (url === '/admin/settings') result = { ...settings, facePhotoUploadEnabled: enabled };
      return { data: { result } };
    },
    async post(url, body, config) {
      calls.push({ method: 'POST', url, body, config });
      if (url === '/identity/progress/face-photo') {
        assert.equal(enabled, true); assert.equal(config.params.consent, true);
        assert.ok(body.get('face')); assert.equal(body.get('face').type, 'image/jpeg');
        progress = { ...progress, facePhotoUploaded: true, scanPassed: false, version: 1 };
        return { data: { result: progress } };
      }
      if (url === '/identity/progress/review') {
        assert.equal(body.fullName, 'SYNTHETIC USER');
        return { data: { result: { id: 'synthetic-review', status: 'REQUESTED' } } };
      }
      throw Error('Unexpected write ' + url);
    },
    async patch(url, body) {
      calls.push({ method: 'PATCH', url, body });
      assert.equal(url, '/admin/settings/identity');
      assert.deepEqual(Object.keys(body), ['facePhotoUploadEnabled']);
      enabled = body.facePhotoUploadEnabled;
      return { data: { result: { ...settings, facePhotoUploadEnabled: enabled } } };
    },
  };
  const output = await build({ stdin: { resolveDir: root, loader: 'tsx', contents: `
    export {default as FacePage} from './src/features/identity/pages/FaceComparisonPage';
    export {default as ManagementPage} from './src/features/management/pages/ManagementPage';
    export {FeedbackContext} from './src/components/feedback/FeedbackContext';` },
    bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', write: false, external: ['react','react-dom','react-router-dom'],
    loader: { '.css': 'empty' }, define: { 'import.meta.env': '{}' }, plugins: [{ name: 'synthetic-api', setup(b) {
      b.onResolve({ filter: /(?:^|\/)config\/axios$/ }, () => ({ path: 'fixture-api', namespace: 'fixture' }));
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export default globalThis.photoTestApi; export function isIdentityActionHandled(){return false;}' }));
    } }] });
  const compiled = new Module(path.join(root, 'photo-fixture.cjs')); compiled.filename = path.join(root, 'photo-fixture.cjs'); compiled.paths = Module._nodeModulePaths(root);
  compiled._compile(output.outputFiles[0].text, compiled.filename);
  const React = requireFE('react'), { act } = React, { createRoot } = requireFE('react-dom/client'), { MemoryRouter } = requireFE('react-router-dom');
  const { FacePage, ManagementPage, FeedbackContext } = compiled.exports;
  const renderer = createRoot(document.getElementById('root'));
  const settle = async () => { for (let i=0;i<2;i++) await act(async () => { await new Promise(resolve => setTimeout(resolve, 15)); }); };
  let renderId = 0;
  const render = async component => {
    await act(async () => renderer.render(React.createElement(MemoryRouter, { key: ++renderId },
      React.createElement(FeedbackContext.Provider, { value: { confirm: async () => false } }, component))));
    await settle();
  };
  const button = text => [...document.querySelectorAll('button')].find(node => node.textContent === text);
  const click = async text => { assert.ok(button(text), text); await act(async () => button(text).click()); await settle(); };
  const change = async (input, value) => {
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
  };
  try {
    await render(React.createElement(FacePage));
    assert.equal(document.querySelector('[aria-label="Chọn ảnh khuôn mặt"]'), null);
    assert.ok(button('Mở camera')); assert.equal(button('Mở camera').disabled, true);
    await act(async () => document.querySelector('input[type="checkbox"]').click());
    assert.equal(button('Mở camera').disabled, false);

    await render(React.createElement(ManagementPage, { panel: 'settings' }));
    const fee = [...document.querySelectorAll('label')].find(node => node.textContent.startsWith('Người thuê trả')).querySelector('input');
    await change(fee, '20000');
    const toggle = document.querySelector('[aria-label="Cho phép tải ảnh khuôn mặt"]');
    assert.equal(toggle.checked, false);
    await act(async () => toggle.click());
    await click('Lưu phương thức xác minh');
    assert.equal(enabled, true); assert.match(fee.value, /20/);
    assert.equal(calls.filter(call => call.url === '/admin/settings').length, 0, 'Identity toggle must not submit fees');

    await render(React.createElement(FacePage));
    let input = document.querySelector('[aria-label="Chọn ảnh khuôn mặt"]'); assert.ok(input); assert.equal(input.disabled, true);
    await act(async () => document.querySelector('input[type="checkbox"]').click());
    assert.equal(input.disabled, false);
    const file = new File([new Uint8Array(6000)], 'synthetic.jpg', { type: 'image/jpeg' });
    await act(async () => { Object.defineProperty(input, 'files', { value: [file], configurable: true }); input.dispatchEvent(new Event('change', { bubbles: true })); });
    await settle();
    assert.ok(button('Mở lại camera selfie'));
    assert.match(document.body.textContent, /Selfie phải khớp ảnh khuôn mặt đã tải lên/);
    assert.equal(button('Xác minh hồ sơ'), undefined);

    enabled = false;
    await act(async () => window.dispatchEvent(new Event('focus'))); await settle();
    assert.equal(button('Mở lại camera selfie').disabled, true);
    await click('Quét bằng camera');
    assert.equal(document.querySelector('[aria-label="Chọn ảnh khuôn mặt"]'), null);
    assert.ok(button('Mở camera'));

    enabled = true;
    progress = { ...progress, selfiePassed: true, frontPassed: true, backPassed: true, frontUrl: '/front', backUrl: '/back', documentNumber: '012345678901' };
    await render(React.createElement(FacePage));
    assert.equal(button('Xác minh hồ sơ'), undefined);
    await click('Yêu cầu kiểm tra danh tính');
    input = [...document.querySelectorAll('label')].find(node => node.textContent.startsWith('Họ và tên trên giấy tờ')).querySelector('input');
    await change(input, 'SYNTHETIC USER');
    await click('Gửi yêu cầu xét duyệt');
    assert.match(document.body.textContent, /trong thời gian xét duyệt/);
    assert.equal(calls.filter(call => call.url === '/identity/progress/finish').length, 0);

    progress = { scanPassed: false, status: 'DRAFT' }; optionsFailed = true;
    await render(React.createElement(FacePage));
    assert.equal(document.querySelector('[aria-label="Chọn ảnh khuôn mặt"]'), null);
    assert.ok(button('Mở camera'));
  } finally {
    await act(async () => renderer.unmount()); dom.window.close(); delete global.photoTestApi;
  }
});
