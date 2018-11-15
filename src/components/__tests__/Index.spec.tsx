import Layout, { utils } from '../../index';
import { temporaryGroupId } from '../Layout';

describe('index', () => {
  test('should export default layout', () => {
    expect(Layout);
  });

  test('should export utils functions', () => {
    expect(utils);
    expect(utils.isTemporaryGroup({ i: temporaryGroupId, w: 1, h: 1, x: 1, y: 1 })).toBeTruthy();
  });
});