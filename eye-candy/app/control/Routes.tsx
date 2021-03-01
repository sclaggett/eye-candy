/* eslint react/jsx-props-no-spreading: off */
import React from 'react';
import { Switch, Route } from 'react-router-dom';
import routes from './constants/Routes.json';
import App from './containers/App';
import ControlPage from './containers/ControlPage';

export default function Routes() {
  return (
    <App>
      <Switch>
        <Route path={routes.CONTROL} component={ControlPage} />
      </Switch>
    </App>
  );
}
