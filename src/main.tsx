import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Fix for React crash when browser extensions (like Google Translate) modify the DOM
if (typeof Node !== 'undefined' && Node.prototype) {
  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function<T extends Node>(child: T): T {
    if (child.parentNode !== this) {
      if (console) {
        console.warn('Ignored removeChild call: node is not a child of this parent.', child);
      }
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function<T extends Node>(newNode: T, referenceNode: Node | null): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      if (console) {
        console.warn('Ignored insertBefore call: referenceNode is not a child of this parent.', referenceNode);
      }
      return newNode;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
