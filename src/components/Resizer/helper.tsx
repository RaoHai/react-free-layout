import React from 'react';

export default function ResizeHelper(
  { size, style }: { size: { w: number; h: number }, style: {} }) {
  return (<div className="react-grid-layout-resize-helper" style={style}>
    {size.w} x {size.h}
  </div>);
}
