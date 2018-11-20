import Layout, { utils } from '../../index';
import { temporaryGroupId } from '../Layout';
import { isTemporaryGroup } from '../../utils/layout';

describe('index', () => {
  test('should export default layout', () => {
    expect(Layout);
  });

  test('should export utils functions', () => {
    expect(utils);
    expect(isTemporaryGroup({ i: temporaryGroupId, w: 1, h: 1, x: 1, y: 1 })).toBeTruthy();
  });
});