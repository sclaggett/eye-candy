import React, { Fragment } from 'react';
import { render } from 'react-dom';
import { AppContainer as ReactHotAppContainer } from 'react-hot-loader';
import Root from './containers/Root';
import { history, configuredStore } from './store';
import './global.css';

document.addEventListener('DOMContentLoaded', () => {
  /**
   * This application uses two renderer processes: a control window and an offscreen stimulus
   * window. Both this file and the corresponding one from the control process will be executed
   * inside both renderer processes. Start by checking if we're running in the stimulus process
   * by checking for a named div that is specific to that window's HTML. Quietly exit without
   * doing anything if we're in the wrong process.
   */
  const rootDiv = document.getElementById('stimulusRoot');
  if (!rootDiv) {
    return;
  }

  const store = configuredStore();

  const AppContainer = process.env.PLAIN_HMR ? Fragment : ReactHotAppContainer;

  render(
    <AppContainer>
      <Root store={store} history={history} />
    </AppContainer>,
    rootDiv
  );
});
