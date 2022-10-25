/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CLOSE_ALERTS_SUCCESS = (numAlerts: number) =>
  i18n.translate('xpack.securitySolution.ruleExceptions.logic.closeAlerts.success', {
    values: { numAlerts },
    defaultMessage:
      'Successfully updated {numAlerts} {numAlerts, plural, =1 {alert} other {alerts}}',
  });

export const CLOSE_ALERTS_ERROR = i18n.translate(
  'xpack.securitySolution.ruleExceptions.logic.closeAlerts.error',
  {
    defaultMessage: 'Failed to close alerts',
  }
);
