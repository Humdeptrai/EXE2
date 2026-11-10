/* Run: JSDOM_MODULE=/path/to/jsdom ESBUILD_MODULE=/path/to/esbuild
 *      node --test tests/profile-save.test.cjs
 * React DOM integration with the real profile components and synthetic API data.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Module = require('node:module');
const { JSDOM } = require(process.env.JSDOM_MODULE || 'jsdom');
const root = path.resolve(__dirname, '..');
const requireFE = Module.createRequire(path.join(root, 'package.json'));
const { build } = process.env.ESBUILD_MODULE ? require(process.env.ESBUILD_MODULE) : requireFE('esbuild');

test('field saves update saved completion without submitting or discarding other drafts', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/profile?onboarding=1', pretendToBeVisual: true });
  for (const key of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLTextAreaElement', 'Event', 'localStorage']) global[key] = dom.window[key];
  global.IS_REACT_ACT_ENVIRONMENT = true;
  global.IntersectionObserver = class { observe() {} disconnect() {} };
  const React = requireFE('react');
  const { act } = React;
  const { createRoot } = requireFE('react-dom/client');
  const { MemoryRouter, useLocation } = requireFE('react-router-dom');
  const output = await build({
    stdin: { contents: `export { default as ProfilePage } from './src/features/profile/pages/ProfilePage'; export { AuthContext } from './src/context/AuthContext'; export { FeedbackContext } from './src/components/feedback/FeedbackContext';`, resolveDir: root, loader: 'tsx' },
    bundle: true, platform: 'node', format: 'cjs', jsx: 'automatic', write: false, define: { 'import.meta.env': '{}' },
    external: ['react', 'react-dom', 'react-router-dom'], loader: { '.css': 'empty' },
    plugins: [{ name: 'synthetic-api', setup(b) {
      b.onResolve({ filter: /(?:^|\/)config\/axios$/ }, () => ({ path: 'fixture-api', namespace: 'fixture' }));
      b.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: 'export default globalThis.profileTestApi;' }));
    } }],
  });
  let user = { id: 'synthetic-user', fullName: 'Synthetic User', email: 'test@example.invalid', phone: null, bio: null, location: 'Khu vực mẫu', tags: [], avatarUrl: null, profileCompleted: false, updatedAt: 'initial' };
  let activity = { place: { area: 'Khu vực mẫu', address: 'Khu vực mẫu', latitude: 10, longitude: 106 }, radiusKm: 5 };
  const writes = [];
  let failNext = false;
  let persist;
  let currentPath;
  let identityProgress = {};
  global.profileTestApi = {
    async get(url) {
      const result = url === '/locations/activity' ? activity : url === '/profile-skills' ? [{ id: 'skill', name: 'Chăm sóc cây', status: 'APPROVED' }]
        : url === '/identity/progress/profile' ? { eligibility: { identityVerified: false, selfieVerified: false, documentConfirmed: false, identityStatus: 'DRAFT' }, personal: { verification: { status: 'DRAFT' }, documentFullName: 'TÊN CŨ' }, progress: identityProgress } : [];
      return { data: { result } };
    },
  };
  const compiled = new Module(path.join(root, 'profile-dom-fixture.cjs'));
  compiled.filename = path.join(root, 'profile-dom-fixture.cjs');
  compiled.paths = Module._nodeModulePaths(root);
  compiled._compile(output.outputFiles[0].text, compiled.filename);
  const { ProfilePage, AuthContext, FeedbackContext } = compiled.exports;
  function LocationProbe() {
    const location = useLocation();
    currentPath = location.pathname;
    return null;
  }
  function Fixture() {
    const [current, setUser] = React.useState(user);
    persist = setUser;
    const updateProfile = async data => {
      writes.push(data);
      if (failNext) { failNext = false; throw Error('Synthetic save failure'); }
      const { activityLocation, ...profile } = data;
      if (activityLocation) activity = activityLocation;
      user = { ...user, ...profile, profileCompleted: Boolean(profile.fullName && profile.phone && profile.location), updatedAt: String(writes.length) };
      setUser(user);
      return user;
    };
    return React.createElement(MemoryRouter, { initialEntries: ['/profile?onboarding=1'] },
      React.createElement(AuthContext.Provider, { value: { user: current, updateProfile } },
        React.createElement(FeedbackContext.Provider, { value: { confirm: async () => false } }, React.createElement(LocationProbe), React.createElement(ProfilePage))));
  }
  const renderer = createRoot(document.getElementById('root'));
  const settle = async () => { await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); }); };
  const button = text => [...document.querySelectorAll('button')].find(node => node.textContent === text);
  const input = label => [...document.querySelectorAll('label')].find(node => node.textContent.startsWith(label)).querySelector('input,textarea,select');
  const fill = async (label, value) => {
    const field = input(label);
    await act(async () => {
      Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value').set.call(field, value);
      field.dispatchEvent(new Event(field.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    });
  };
  const click = async text => { assert.ok(button(text), text); await act(async () => button(text).click()); await settle(); };
  const progress = () => Number(document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow'));
  const check = label => [...document.querySelectorAll('aside span')].find(node => node.textContent === label).parentElement.textContent.includes('✓');
  try {
    await act(async () => renderer.render(React.createElement(Fixture)));
    await settle();
    assert.equal(progress(), 23);
    assert.equal(document.getElementById('private-document-name').value, 'TEN CU');
    identityProgress = { status: 'DRAFT', frontUrl: '/identity/progress/images/front', documentFullName: 'TRỊNH ĐẠT HOÀNG' };
    await act(async () => window.dispatchEvent(new Event('focus')));
    await settle();
    assert.equal(document.getElementById('private-document-name').value, 'TRINH DAT HOANG');
    identityProgress = { status: 'DRAFT', frontUrl: '/identity/progress/images/front', documentFullName: null };
    await act(async () => window.dispatchEvent(new Event('focus')));
    await settle();
    assert.equal(document.getElementById('private-document-name').value, '');
    await fill('Họ và tên', '');
    await fill('Giới thiệu bản thân', 'Bản nháp chưa lưu');
    await click('+ Chăm sóc cây');
    await fill('Số điện thoại', '0912345678');
    assert.equal(progress(), 23);
    assert.equal(check('Số điện thoại'), false);
    await click('Lưu số điện thoại');
    assert.equal(progress(), 30);
    assert.equal(check('Số điện thoại'), true);
    assert.equal(currentPath, '/profile');
    assert.equal(writes[0].fullName, 'Synthetic User');
    assert.equal(writes[0].bio, '');
    assert.deepEqual(writes[0].tags, []);
    assert.equal(input('Giới thiệu bản thân').value, 'Bản nháp chưa lưu');
    assert.equal(input('Họ và tên').value, '');
    assert.ok(button('✓ Chăm sóc cây'));
    await click('Lưu kỹ năng & sở thích');
    assert.equal(progress(), 38);
    assert.equal(check('Ít nhất 1 kỹ năng'), true);
    assert.equal(user.phone, '0912345678');

    const count = writes.length;
    await fill('Số điện thoại', '123');
    await click('Lưu số điện thoại');
    assert.equal(writes.length, count);
    await fill('Số điện thoại', '0987654321');
    failNext = true;
    await click('Lưu số điện thoại');
    assert.equal(progress(), 38);
    assert.equal(user.phone, '0912345678');
    assert.equal(input('Số điện thoại').value, '0987654321');
    await fill('Số điện thoại', '');
    await click('Lưu số điện thoại');
    assert.equal(progress(), 30);
    assert.equal(check('Số điện thoại'), false);

    await fill('Phạm vi tìm việc mặc định', '10');
    await click('Lưu khu vực');
    assert.equal(activity.radiusKm, 10);
    assert.equal(input('Giới thiệu bản thân').value, 'Bản nháp chưa lưu');
    await click('Lưu giới thiệu');
    assert.equal(progress(), 38);
    assert.equal(check('Giới thiệu'), true);
    // A refreshed account response must not restore unrelated unsaved drafts.
    await act(async () => persist({ ...user }));
    await click('Đóng chỉnh sửa');
    await click('Chỉnh sửa hồ sơ');
    assert.equal(input('Giới thiệu bản thân').value, 'Bản nháp chưa lưu');
    assert.equal(input('Họ và tên').value, 'Synthetic User');
    assert.equal(input('Số điện thoại').value, '');

    await fill('Họ và tên', 'Tên đã cập nhật');
    await click('Lưu họ tên');
    assert.equal(user.fullName, 'Tên đã cập nhật');
    await click('✓ Chăm sóc cây');
    await click('Lưu kỹ năng & sở thích');
    assert.equal(check('Ít nhất 1 kỹ năng'), false);
    assert.equal(progress(), 30);
    await fill('Số điện thoại', '0912345678');
    await fill('Giới thiệu bản thân', 'Lưu toàn bộ hồ sơ');
    await act(async () => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    await settle();
    assert.equal(user.bio, 'Lưu toàn bộ hồ sơ');
    assert.equal(user.phone, '0912345678');
    assert.equal(currentPath, '/onboarding');
  } finally {
    await act(async () => renderer.unmount());
    dom.window.close();
    delete global.profileTestApi;
  }
});
