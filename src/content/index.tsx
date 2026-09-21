import React from 'react';
import ReactDOM from 'react-dom/client';
import { OverlayApp } from './overlay';
import './styles.css';

// Create isolated container for our UI
const container = document.createElement('div');
container.id = 'autoapply-root';
container.style.cssText = 'all: initial; position: fixed; z-index: 2147483647; pointer-events: none;';
document.body.appendChild(container);

// Make container and its children interactive
const style = document.createElement('style');
style.textContent = `
  #autoapply-root, #autoapply-root * {
    pointer-events: auto !important;
  }
`;
document.head.appendChild(style);

// Mount React app
const root = ReactDOM.createRoot(container);
root.render(
  <React.StrictMode>
    <OverlayApp />
  </React.StrictMode>
);

console.log('AutoApply: Content script loaded');
