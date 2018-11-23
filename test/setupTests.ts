import { configure } from 'enzyme';
import EnzymeAdapter from 'enzyme-adapter-react-16';
import {createSerializer} from 'enzyme-to-json';

configure({ adapter: new EnzymeAdapter() });
expect.addSnapshotSerializer(createSerializer({ mode: 'deep' }));

Element.prototype.getBoundingClientRect = function () {
  const style = this.style as CSSStyleDeclaration;
  const left = parseFloat(style.getPropertyValue('left') || '0');
  const top = parseFloat(style.getPropertyValue('top') || '0');
  const width = parseFloat(style.getPropertyValue('width'));
  const height = parseFloat(style.getPropertyValue('height'));

  return {
    top,
    left,
    width,
    height,
    bottom: top + height,
    right: left + width,
  };
};