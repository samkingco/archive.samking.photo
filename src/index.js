import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

// Export top level component as JSX (for static rendering)
export default App;

if (typeof document !== 'undefined') {
  const target = document.getElementById('root');

  const renderMethod = target.hasChildNodes()
    ? ReactDOM.hydrate
    : ReactDOM.render;

  const render = Comp => {
    renderMethod(<Comp />, target);
  };

  render(App);

  if (module && module.hot) {
    module.hot.accept('./App', () => {
      render(App);
    });
  }
}
