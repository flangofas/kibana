/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from '../../../../../../src/core/server';
import { externalServiceMock, apiParams, serviceNowCommonFields } from './mocks';
import { ExternalService } from './types';
import { api } from './api';
let mockedLogger: jest.Mocked<Logger>;

describe('api', () => {
  let externalService: jest.Mocked<ExternalService>;

  beforeEach(() => {
    externalService = externalServiceMock.create();
  });

  describe('create incident', () => {
    test('it creates an incident', async () => {
      const params = { ...apiParams, incident: { ...apiParams.incident, externalId: null } };
      const res = await api.pushToService({
        externalService,
        params,
        secrets: {},
        logger: mockedLogger,
      });

      expect(res).toEqual({
        id: 'incident-1',
        title: 'INC01',
        pushedDate: '2020-03-10T12:24:20.000Z',
        url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
        comments: [
          {
            commentId: 'case-comment-1',
            pushedDate: '2020-03-10T12:24:20.000Z',
          },
          {
            commentId: 'case-comment-2',
            pushedDate: '2020-03-10T12:24:20.000Z',
          },
        ],
      });
    });

    test('it creates an incident without comments', async () => {
      const params = {
        ...apiParams,
        incident: { ...apiParams.incident, externalId: null },
        comments: [],
      };
      const res = await api.pushToService({
        externalService,
        params,
        secrets: {},
        logger: mockedLogger,
      });

      expect(res).toEqual({
        id: 'incident-1',
        title: 'INC01',
        pushedDate: '2020-03-10T12:24:20.000Z',
        url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
      });
    });

    test('it calls createIncident correctly', async () => {
      const params = {
        incident: { ...apiParams.incident, externalId: null },
        comments: [],
      };
      await api.pushToService({
        externalService,
        params,
        secrets: { username: 'elastic', password: 'elastic' },
        logger: mockedLogger,
      });

      expect(externalService.createIncident).toHaveBeenCalledWith({
        incident: {
          severity: '1',
          urgency: '2',
          impact: '3',
          caller_id: 'elastic',
          description: 'Incident description',
          short_description: 'Incident title',
        },
      });
      expect(externalService.updateIncident).not.toHaveBeenCalled();
    });

    test('it calls updateIncident correctly when creating an incident and having comments', async () => {
      const params = { ...apiParams, incident: { ...apiParams.incident, externalId: null } };
      await api.pushToService({
        externalService,
        params,
        secrets: {},
        logger: mockedLogger,
      });
      expect(externalService.updateIncident).toHaveBeenCalledTimes(2);
      expect(externalService.updateIncident).toHaveBeenNthCalledWith(1, {
        incident: {
          severity: '1',
          urgency: '2',
          impact: '3',
          comments: 'A comment',
          description: 'Incident description',
          short_description: 'Incident title',
        },
        incidentId: 'incident-1',
      });

      expect(externalService.updateIncident).toHaveBeenNthCalledWith(2, {
        incident: {
          severity: '1',
          urgency: '2',
          impact: '3',
          comments: 'Another comment',
          description: 'Incident description',
          short_description: 'Incident title',
        },
        incidentId: 'incident-1',
      });
    });
  });

  describe('update incident', () => {
    test('it updates an incident', async () => {
      const res = await api.pushToService({
        externalService,
        params: apiParams,
        secrets: {},
        logger: mockedLogger,
      });

      expect(res).toEqual({
        id: 'incident-2',
        title: 'INC02',
        pushedDate: '2020-03-10T12:24:20.000Z',
        url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
        comments: [
          {
            commentId: 'case-comment-1',
            pushedDate: '2020-03-10T12:24:20.000Z',
          },
          {
            commentId: 'case-comment-2',
            pushedDate: '2020-03-10T12:24:20.000Z',
          },
        ],
      });
    });

    test('it updates an incident without comments', async () => {
      const params = { ...apiParams, comments: [] };
      const res = await api.pushToService({
        externalService,
        params,
        secrets: {},
        logger: mockedLogger,
      });

      expect(res).toEqual({
        id: 'incident-2',
        title: 'INC02',
        pushedDate: '2020-03-10T12:24:20.000Z',
        url: 'https://instance.service-now.com/nav_to.do?uri=incident.do?sys_id=123',
      });
    });

    test('it calls updateIncident correctly', async () => {
      const params = { ...apiParams };
      await api.pushToService({
        externalService,
        params,
        secrets: {},
        logger: mockedLogger,
      });

      expect(externalService.updateIncident).toHaveBeenCalledWith({
        incidentId: 'incident-3',
        incident: {
          severity: '1',
          urgency: '2',
          impact: '3',
          description: 'Incident description',
          short_description: 'Incident title',
        },
      });
      expect(externalService.createIncident).not.toHaveBeenCalled();
    });

    test('it calls updateIncident to create a comments correctly', async () => {
      const params = { ...apiParams };
      await api.pushToService({
        externalService,
        params,
        secrets: {},
        logger: mockedLogger,
      });
      expect(externalService.updateIncident).toHaveBeenCalledTimes(3);
      expect(externalService.updateIncident).toHaveBeenNthCalledWith(1, {
        incident: {
          severity: '1',
          urgency: '2',
          impact: '3',
          description: 'Incident description',
          short_description: 'Incident title',
        },
        incidentId: 'incident-3',
      });

      expect(externalService.updateIncident).toHaveBeenNthCalledWith(2, {
        incident: {
          severity: '1',
          urgency: '2',
          impact: '3',
          comments: 'A comment',
          description: 'Incident description',
          short_description: 'Incident title',
        },
        incidentId: 'incident-2',
      });
    });
  });

  describe('getFields', () => {
    test('it returns the fields correctly', async () => {
      const res = await api.getFields({
        externalService,
        params: {},
      });
      expect(res).toEqual(serviceNowCommonFields);
    });
  });
});
