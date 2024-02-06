/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit, pick } from 'lodash';
import { createRuleRoute } from './create_rule_route';
import { httpServiceMock } from '@kbn/core/server/mocks';
import { licenseStateMock } from '../../../../lib/license_state.mock';
import { verifyApiAccess } from '../../../../lib/license_api_access';
import { mockHandlerArguments } from '../../../_mock_handler_arguments';
import type { CreateRuleRequestBodyV1 } from '../../../../../common/routes/rule/apis/create';
import { rulesClientMock } from '../../../../rules_client.mock';
import { RuleTypeDisabledError } from '../../../../lib';
import {
  RuleActionTypes,
  RuleDefaultAction,
  RuleSystemAction,
  SanitizedRule,
} from '../../../../types';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { actionsClientMock } from '@kbn/actions-plugin/server/mocks';

const rulesClient = rulesClientMock.create();

jest.mock('../../../../lib/license_api_access', () => ({
  verifyApiAccess: jest.fn(),
}));

beforeEach(() => {
  jest.resetAllMocks();
});

describe('createRuleRoute', () => {
  const createdAt = new Date();
  const updatedAt = new Date();
  const action: RuleDefaultAction = {
    actionTypeId: 'test',
    group: 'default',
    id: '2',
    params: {
      foo: true,
    },
    uuid: '123-456',
    alertsFilter: {
      query: {
        kql: 'name:test',
        dsl: '{"must": {"term": { "name": "test" }}}',
        filters: [],
      },
      timeframe: {
        days: [1],
        hours: { start: '08:00', end: '17:00' },
        timezone: 'UTC',
      },
    },
    type: RuleActionTypes.DEFAULT,
  };

  const systemAction: RuleSystemAction = {
    actionTypeId: 'test-2',
    id: 'system_action-id',
    params: {
      foo: true,
    },
    uuid: '123-456',
    type: RuleActionTypes.SYSTEM,
  };

  const mockedAlert: SanitizedRule<{ bar: boolean }> = {
    alertTypeId: '1',
    consumer: 'bar',
    name: 'abc',
    schedule: { interval: '10s' },
    tags: ['foo'],
    params: {
      bar: true,
    },
    throttle: '30s',
    actions: [action],
    enabled: true,
    muteAll: false,
    createdBy: '',
    updatedBy: '',
    apiKeyOwner: '',
    mutedInstanceIds: [],
    notifyWhen: 'onActionGroupChange',
    createdAt,
    updatedAt,
    id: '123',
    executionStatus: {
      status: 'unknown',
      lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
    },
    revision: 0,
  };

  const ruleToCreate: CreateRuleRequestBodyV1<{ bar: boolean }> = {
    ...pick(mockedAlert, 'consumer', 'name', 'schedule', 'tags', 'params', 'throttle', 'enabled'),
    rule_type_id: mockedAlert.alertTypeId,
    notify_when: mockedAlert.notifyWhen,
    actions: [
      {
        group: action.group,
        id: mockedAlert.actions[0].id,
        params: mockedAlert.actions[0].params,
        alerts_filter: {
          query: {
            kql: action.alertsFilter!.query!.kql,
            filters: [],
          },
          timeframe: action.alertsFilter?.timeframe!,
        },
      },
    ],
  };

  const createResult = {
    ...ruleToCreate,
    mute_all: mockedAlert.muteAll,
    created_by: mockedAlert.createdBy,
    updated_by: mockedAlert.updatedBy,
    api_key_owner: mockedAlert.apiKeyOwner,
    muted_alert_ids: mockedAlert.mutedInstanceIds,
    created_at: mockedAlert.createdAt,
    updated_at: mockedAlert.updatedAt,
    id: mockedAlert.id,
    revision: mockedAlert.revision,
    execution_status: {
      status: mockedAlert.executionStatus.status,
      last_execution_date: mockedAlert.executionStatus.lastExecutionDate,
    },
    actions: [
      {
        ...ruleToCreate.actions[0],
        alerts_filter: {
          query: action.alertsFilter?.query!,
          timeframe: action.alertsFilter!.timeframe!,
        },
        connector_type_id: 'test',
        uuid: '123-456',
      },
    ],
  };

  it('creates a rule with proper parameters', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    createRuleRoute({
      router,
      licenseState,
      encryptedSavedObjects,
      usageCounter: mockUsageCounter,
    });

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id?}"`);

    rulesClient.create.mockResolvedValueOnce(mockedAlert);

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        body: ruleToCreate,
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({
      body: {
        ...createResult,
        created_at: createResult.created_at.toISOString(),
        updated_at: createResult.updated_at.toISOString(),
        execution_status: {
          ...createResult.execution_status,
          last_execution_date: createResult.execution_status.last_execution_date.toISOString(),
        },
      },
    });

    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
    expect(rulesClient.create).toHaveBeenCalledTimes(1);
    expect(rulesClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {
            "actions": Array [
              Object {
                "actionTypeId": undefined,
                "alertsFilter": Object {
                  "query": Object {
                    "filters": Array [],
                    "kql": "name:test",
                  },
                  "timeframe": Object {
                    "days": Array [
                      1,
                    ],
                    "hours": Object {
                      "end": "17:00",
                      "start": "08:00",
                    },
                    "timezone": "UTC",
                  },
                },
                "group": "default",
                "id": "2",
                "params": Object {
                  "foo": true,
                },
              },
            ],
            "alertTypeId": "1",
            "consumer": "bar",
            "enabled": true,
            "name": "abc",
            "notifyWhen": "onActionGroupChange",
            "params": Object {
              "bar": true,
            },
            "schedule": Object {
              "interval": "10s",
            },
            "tags": Array [
              "foo",
            ],
            "throttle": "30s",
          },
          "options": Object {
            "id": undefined,
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        ...createResult,
        created_at: createResult.created_at.toISOString(),
        updated_at: createResult.updated_at.toISOString(),
        execution_status: {
          ...createResult.execution_status,
          last_execution_date: createResult.execution_status.last_execution_date.toISOString(),
        },
      },
    });
  });

  it('allows providing a custom id when space is undefined', async () => {
    const expectedResult = {
      ...createResult,
      id: 'custom-id',
    };
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    createRuleRoute({
      router,
      licenseState,
      encryptedSavedObjects,
      usageCounter: mockUsageCounter,
    });

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id?}"`);

    rulesClient.create.mockResolvedValueOnce({
      ...mockedAlert,
      id: 'custom-id',
    });

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: 'custom-id' },
        body: ruleToCreate,
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({
      body: {
        ...expectedResult,
        created_at: expectedResult.created_at.toISOString(),
        updated_at: expectedResult.updated_at.toISOString(),
        execution_status: {
          ...expectedResult.execution_status,
          last_execution_date: expectedResult.execution_status.last_execution_date.toISOString(),
        },
      },
    });

    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(1);
    expect(rulesClient.create).toHaveBeenCalledTimes(1);
    expect(rulesClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {
            "actions": Array [
              Object {
                "actionTypeId": undefined,
                "alertsFilter": Object {
                  "query": Object {
                    "filters": Array [],
                    "kql": "name:test",
                  },
                  "timeframe": Object {
                    "days": Array [
                      1,
                    ],
                    "hours": Object {
                      "end": "17:00",
                      "start": "08:00",
                    },
                    "timezone": "UTC",
                  },
                },
                "group": "default",
                "id": "2",
                "params": Object {
                  "foo": true,
                },
              },
            ],
            "alertTypeId": "1",
            "consumer": "bar",
            "enabled": true,
            "name": "abc",
            "notifyWhen": "onActionGroupChange",
            "params": Object {
              "bar": true,
            },
            "schedule": Object {
              "interval": "10s",
            },
            "tags": Array [
              "foo",
            ],
            "throttle": "30s",
          },
          "options": Object {
            "id": "custom-id",
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        ...expectedResult,
        created_at: expectedResult.created_at.toISOString(),
        updated_at: expectedResult.updated_at.toISOString(),
        execution_status: {
          ...expectedResult.execution_status,
          last_execution_date: expectedResult.execution_status.last_execution_date.toISOString(),
        },
      },
    });
  });

  it('allows providing a custom id in default space', async () => {
    const expectedResult = {
      ...createResult,
      id: 'custom-id',
    };
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    createRuleRoute({
      router,
      licenseState,
      encryptedSavedObjects,
      usageCounter: mockUsageCounter,
    });

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id?}"`);

    rulesClient.create.mockResolvedValueOnce({
      ...mockedAlert,
      id: 'custom-id',
    });
    rulesClient.getSpaceId.mockReturnValueOnce('default');

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: 'custom-id' },
        body: ruleToCreate,
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({
      body: {
        ...expectedResult,
        created_at: expectedResult.created_at.toISOString(),
        updated_at: expectedResult.updated_at.toISOString(),
        execution_status: {
          ...expectedResult.execution_status,
          last_execution_date: expectedResult.execution_status.last_execution_date.toISOString(),
        },
      },
    });

    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(1);
    expect(rulesClient.create).toHaveBeenCalledTimes(1);
    expect(rulesClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {
            "actions": Array [
              Object {
                "actionTypeId": undefined,
                "alertsFilter": Object {
                  "query": Object {
                    "filters": Array [],
                    "kql": "name:test",
                  },
                  "timeframe": Object {
                    "days": Array [
                      1,
                    ],
                    "hours": Object {
                      "end": "17:00",
                      "start": "08:00",
                    },
                    "timezone": "UTC",
                  },
                },
                "group": "default",
                "id": "2",
                "params": Object {
                  "foo": true,
                },
              },
            ],
            "alertTypeId": "1",
            "consumer": "bar",
            "enabled": true,
            "name": "abc",
            "notifyWhen": "onActionGroupChange",
            "params": Object {
              "bar": true,
            },
            "schedule": Object {
              "interval": "10s",
            },
            "tags": Array [
              "foo",
            ],
            "throttle": "30s",
          },
          "options": Object {
            "id": "custom-id",
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        ...expectedResult,
        created_at: expectedResult.created_at.toISOString(),
        updated_at: expectedResult.updated_at.toISOString(),
        execution_status: {
          ...expectedResult.execution_status,
          last_execution_date: expectedResult.execution_status.last_execution_date.toISOString(),
        },
      },
    });
  });

  it('allows providing a custom id in non-default space', async () => {
    const expectedResult = {
      ...createResult,
      id: 'custom-id',
    };
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    createRuleRoute({
      router,
      licenseState,
      encryptedSavedObjects,
      usageCounter: mockUsageCounter,
    });

    const [config, handler] = router.post.mock.calls[0];

    expect(config.path).toMatchInlineSnapshot(`"/api/alerting/rule/{id?}"`);

    rulesClient.create.mockResolvedValueOnce({
      ...mockedAlert,
      id: 'custom-id',
    });
    rulesClient.getSpaceId.mockReturnValueOnce('another-space');

    const [context, req, res] = mockHandlerArguments(
      { rulesClient },
      {
        params: { id: 'custom-id' },
        body: ruleToCreate,
      },
      ['ok']
    );

    expect(await handler(context, req, res)).toEqual({
      body: {
        ...expectedResult,
        created_at: expectedResult.created_at.toISOString(),
        updated_at: expectedResult.updated_at.toISOString(),
        execution_status: {
          ...expectedResult.execution_status,
          last_execution_date: expectedResult.execution_status.last_execution_date.toISOString(),
        },
      },
    });

    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(2);
    expect(rulesClient.create).toHaveBeenCalledTimes(1);
    expect(rulesClient.create.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        Object {
          "data": Object {
            "actions": Array [
              Object {
                "actionTypeId": undefined,
                "alertsFilter": Object {
                  "query": Object {
                    "filters": Array [],
                    "kql": "name:test",
                  },
                  "timeframe": Object {
                    "days": Array [
                      1,
                    ],
                    "hours": Object {
                      "end": "17:00",
                      "start": "08:00",
                    },
                    "timezone": "UTC",
                  },
                },
                "group": "default",
                "id": "2",
                "params": Object {
                  "foo": true,
                },
              },
            ],
            "alertTypeId": "1",
            "consumer": "bar",
            "enabled": true,
            "name": "abc",
            "notifyWhen": "onActionGroupChange",
            "params": Object {
              "bar": true,
            },
            "schedule": Object {
              "interval": "10s",
            },
            "tags": Array [
              "foo",
            ],
            "throttle": "30s",
          },
          "options": Object {
            "id": "custom-id",
          },
        },
      ]
    `);

    expect(res.ok).toHaveBeenCalledWith({
      body: {
        ...expectedResult,
        created_at: expectedResult.created_at.toISOString(),
        updated_at: expectedResult.updated_at.toISOString(),
        execution_status: {
          ...expectedResult.execution_status,
          last_execution_date: expectedResult.execution_status.last_execution_date.toISOString(),
        },
      },
    });
  });

  it('ensures the license allows creating rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });

    createRuleRoute({ router, licenseState, encryptedSavedObjects });

    const [, handler] = router.post.mock.calls[0];

    rulesClient.create.mockResolvedValueOnce(mockedAlert);

    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: ruleToCreate });

    await handler(context, req, res);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the license check prevents creating rules', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });

    (verifyApiAccess as jest.Mock).mockImplementation(() => {
      throw new Error('OMG');
    });

    createRuleRoute({ router, licenseState, encryptedSavedObjects });

    const [, handler] = router.post.mock.calls[0];

    rulesClient.create.mockResolvedValueOnce(mockedAlert);

    const [context, req, res] = mockHandlerArguments({ rulesClient }, {});

    expect(handler(context, req, res)).rejects.toMatchInlineSnapshot(`[Error: OMG]`);

    expect(verifyApiAccess).toHaveBeenCalledWith(licenseState);
  });

  it('ensures the rule type gets validated for the license', async () => {
    const licenseState = licenseStateMock.create();
    const router = httpServiceMock.createRouter();
    const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });

    createRuleRoute({ router, licenseState, encryptedSavedObjects });

    const [, handler] = router.post.mock.calls[0];

    rulesClient.create.mockRejectedValue(new RuleTypeDisabledError('Fail', 'license_invalid'));

    const [context, req, res] = mockHandlerArguments({ rulesClient }, { body: ruleToCreate }, [
      'ok',
      'forbidden',
    ]);

    await handler(context, req, res);

    expect(res.forbidden).toHaveBeenCalledWith({ body: { message: 'Fail' } });
  });

  describe('actions', () => {
    it('adds the type of the actions correctly before passing the request to the rules client', async () => {
      const licenseState = licenseStateMock.create();
      const router = httpServiceMock.createRouter();
      const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
      const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
      const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');
      const actionsClient = actionsClientMock.create();
      actionsClient.isSystemAction.mockImplementation((id: string) => id === 'system_action-id');

      createRuleRoute({
        router,
        licenseState,
        encryptedSavedObjects,
        usageCounter: mockUsageCounter,
      });

      const [_, handler] = router.post.mock.calls[0];

      rulesClient.create.mockResolvedValueOnce({ ...mockedAlert, actions: [action, systemAction] });

      const [context, req, res] = mockHandlerArguments(
        { rulesClient, actionsClient },
        {
          body: { ...ruleToCreate, actions: [omit(action, 'type'), omit(systemAction, 'type')] },
        },
        ['ok']
      );

      await handler(context, req, res);

      expect(rulesClient.create.mock.calls[0]).toMatchInlineSnapshot(`
        Array [
          Object {
            "data": Object {
              "actions": Array [
                Object {
                  "actionTypeId": "test",
                  "group": "default",
                  "id": "2",
                  "params": Object {
                    "foo": true,
                  },
                  "uuid": "123-456",
                },
                Object {
                  "actionTypeId": "test-2",
                  "id": "system_action-id",
                  "params": Object {
                    "foo": true,
                  },
                  "uuid": "123-456",
                },
              ],
              "alertTypeId": "1",
              "consumer": "bar",
              "enabled": true,
              "name": "abc",
              "notifyWhen": "onActionGroupChange",
              "params": Object {
                "bar": true,
              },
              "schedule": Object {
                "interval": "10s",
              },
              "tags": Array [
                "foo",
              ],
              "throttle": "30s",
            },
            "options": Object {
              "id": undefined,
            },
          },
        ]
      `);
    });

    it('removes the type from the actions correctly before sending the response', async () => {
      const licenseState = licenseStateMock.create();
      const router = httpServiceMock.createRouter();
      const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
      const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
      const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');
      const actionsClient = actionsClientMock.create();
      actionsClient.isSystemAction.mockImplementation((id: string) => id === 'system_action-id');

      createRuleRoute({
        router,
        licenseState,
        encryptedSavedObjects,
        usageCounter: mockUsageCounter,
      });

      const [_, handler] = router.post.mock.calls[0];

      rulesClient.create.mockResolvedValueOnce({ ...mockedAlert, actions: [action, systemAction] });

      const [context, req, res] = mockHandlerArguments(
        { rulesClient, actionsClient },
        {
          body: ruleToCreate,
        },
        ['ok']
      );

      const routeRes = await handler(context, req, res);

      // @ts-expect-error: body exists
      expect(routeRes.body.actions).toEqual([
        {
          alerts_filter: {
            query: { dsl: '{"must": {"term": { "name": "test" }}}', filters: [], kql: 'name:test' },
            timeframe: { days: [1], hours: { end: '17:00', start: '08:00' }, timezone: 'UTC' },
          },
          connector_type_id: 'test',
          group: 'default',
          id: '2',
          params: { foo: true },
          uuid: '123-456',
        },
        {
          connector_type_id: 'test-2',
          id: 'system_action-id',
          params: { foo: true },
          uuid: '123-456',
        },
      ]);
    });

    it('fails if the action contains a type in the request', async () => {
      const actionToValidate: RuleDefaultAction = {
        actionTypeId: 'test',
        group: 'default',
        id: '2',
        params: {
          foo: true,
        },
        uuid: '123-456',
        type: RuleActionTypes.DEFAULT,
      };

      const licenseState = licenseStateMock.create();
      const router = httpServiceMock.createRouter();
      const encryptedSavedObjects = encryptedSavedObjectsMock.createSetup({ canEncrypt: true });
      const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
      const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

      createRuleRoute({
        router,
        licenseState,
        encryptedSavedObjects,
        usageCounter: mockUsageCounter,
      });

      const [config, _] = router.post.mock.calls[0];

      expect(() =>
        // @ts-expect-error: body exists
        config.validate.body.validate({ ...ruleToCreate, actions: [actionToValidate] })
      ).toThrowErrorMatchingInlineSnapshot(
        `"[actions.0.type]: definition for this key is missing"`
      );
    });
  });
});
