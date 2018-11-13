import Layout, { utils } from '../../index';

test('should export default layout', () => {
  expect(Layout);
});

test('should export utils functions', () => {
  expect(utils);
  expect(utils.isTemporaryGroup);
});