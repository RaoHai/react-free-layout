import { configure } from 'enzyme';
import EnzymeAdapter from 'enzyme-adapter-react-16';
import {createSerializer} from 'enzyme-to-json';

configure({ adapter: new EnzymeAdapter() });
expect.addSnapshotSerializer(createSerializer({ mode: 'deep' }));