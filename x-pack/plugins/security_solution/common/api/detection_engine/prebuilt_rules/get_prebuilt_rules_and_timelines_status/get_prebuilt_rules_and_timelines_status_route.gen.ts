/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from 'zod';

/*
 * NOTICE: Do not edit this file manually.
 * This file is automatically generated by the OpenAPI Generator, @kbn/openapi-generator.
 *
 * info:
 *   title: Prebuilt Rules Status API endpoint
 *   version: 2023-10-31
 */

export type GetPrebuiltRulesAndTimelinesStatusResponse = z.infer<
  typeof GetPrebuiltRulesAndTimelinesStatusResponse
>;
export const GetPrebuiltRulesAndTimelinesStatusResponse = z
  .object({
    /**
     * The total number of custom rules
     */
    rules_custom_installed: z.number().int().min(0),
    /**
     * The total number of installed prebuilt rules
     */
    rules_installed: z.number().int().min(0),
    /**
     * The total number of available prebuilt rules that are not installed
     */
    rules_not_installed: z.number().int().min(0),
    /**
     * The total number of outdated prebuilt rules
     */
    rules_not_updated: z.number().int().min(0),
    /**
     * The total number of installed prebuilt timelines
     */
    timelines_installed: z.number().int().min(0),
    /**
     * The total number of available prebuilt timelines that are not installed
     */
    timelines_not_installed: z.number().int().min(0),
    /**
     * The total number of outdated prebuilt timelines
     */
    timelines_not_updated: z.number().int().min(0),
  })
  .strict();
