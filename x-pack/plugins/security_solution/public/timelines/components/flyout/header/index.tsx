/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiToolTip,
  EuiButtonIcon,
  useEuiTheme,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { isEmpty, get, pick } from 'lodash/fp';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';

import { getEsQueryConfig } from '@kbn/data-plugin/common';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import type { State } from '../../../../common/store';
import { timelineActions, timelineSelectors } from '../../../store/timeline';
import { timelineDefaults } from '../../../store/timeline/defaults';
import { useKibana } from '../../../../common/lib/kibana';
import { useSourcererDataView } from '../../../../common/containers/sourcerer';
import { focusActiveTimelineButton } from '../../timeline/helpers';
import { combineQueries } from '../../../../common/lib/kuery';
import { SourcererScopeName } from '../../../../common/store/sourcerer/model';
import { ActiveTimelines } from './active_timelines';
import * as i18n from './translations';
import { TimelineActionMenu } from '../action_menu';
import { AddToFavoritesButton } from '../../timeline/properties/helpers';
import { TimelineStatusInfoComponent } from './timeline_status_info';

interface FlyoutHeaderPanelProps {
  timelineId: string;
}

const ActiveTimelinesContainer = styled(EuiFlexItem)`
  overflow: hidden;
`;

const FlyoutHeaderPanelComponent: React.FC<FlyoutHeaderPanelProps> = ({ timelineId }) => {
  const dispatch = useDispatch();
  const { browserFields, indexPattern } = useSourcererDataView(SourcererScopeName.timeline);
  const { uiSettings } = useKibana().services;
  const esQueryConfig = useMemo(() => getEsQueryConfig(uiSettings), [uiSettings]);
  const getTimeline = useMemo(() => timelineSelectors.getTimelineByIdSelector(), []);
  const {
    activeTab,
    dataProviders,
    kqlQuery,
    title,
    timelineType,
    status: timelineStatus,
    updated,
    show,
    filters,
    kqlMode,
    changed,
  } = useDeepEqualSelector((state) =>
    pick(
      [
        'activeTab',
        'dataProviders',
        'kqlQuery',
        'status',
        'title',
        'timelineType',
        'updated',
        'show',
        'filters',
        'kqlMode',
        'changed',
      ],
      getTimeline(state, timelineId) ?? timelineDefaults
    )
  );
  const isDataInTimeline = useMemo(
    () => !isEmpty(dataProviders) || !isEmpty(get('filterQuery.kuery.expression', kqlQuery)),
    [dataProviders, kqlQuery]
  );

  const getKqlQueryTimeline = useMemo(() => timelineSelectors.getKqlFilterQuerySelector(), []);
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const kqlQueryTimeline = useSelector((state: State) => getKqlQueryTimeline(state, timelineId)!);

  const kqlQueryExpression =
    isEmpty(dataProviders) && isEmpty(kqlQueryTimeline) && timelineType === 'template'
      ? ' '
      : kqlQueryTimeline;
  const kqlQueryTest = useMemo(
    () => ({ query: kqlQueryExpression, language: 'kuery' }),
    [kqlQueryExpression]
  );

  const combinedQueries = useMemo(
    () =>
      combineQueries({
        config: esQueryConfig,
        dataProviders,
        indexPattern,
        browserFields,
        filters: filters ? filters : [],
        kqlQuery: kqlQueryTest,
        kqlMode,
      }),
    [browserFields, dataProviders, esQueryConfig, filters, indexPattern, kqlMode, kqlQueryTest]
  );

  const handleClose = useCallback(() => {
    dispatch(timelineActions.showTimeline({ id: timelineId, show: false }));
    focusActiveTimelineButton();
  }, [dispatch, timelineId]);

  const { euiTheme } = useEuiTheme();

  return (
    <EuiPanel
      borderRadius="none"
      grow={false}
      paddingSize="s"
      hasShadow={false}
      data-test-subj="timeline-flyout-header-panel"
      data-show={show}
      style={{ backgroundColor: euiTheme.colors.emptyShade, color: euiTheme.colors.text }}
    >
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        justifyContent="spaceBetween"
      >
        <EuiFlexItem grow={false}>
          <EuiFlexGroup gutterSize="xs" alignItems="center">
            <EuiFlexItem grow={false}>
              <ActiveTimelinesContainer grow={false}>
                <ActiveTimelines
                  timelineId={timelineId}
                  timelineType={timelineType}
                  timelineTitle={title}
                  timelineStatus={timelineStatus}
                  isOpen={show}
                  updated={updated}
                  changed={changed}
                />
              </ActiveTimelinesContainer>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <TimelineStatusInfoComponent
                status={timelineStatus}
                updated={updated}
                changed={changed}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <AddToFavoritesButton timelineId={timelineId} compact />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {show && (
          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              justifyContent="flexEnd"
              alignItems="center"
              gutterSize="s"
              responsive={false}
            >
              <TimelineActionMenu
                timelineId={timelineId}
                activeTab={activeTab}
                isInspectButtonDisabled={
                  !isDataInTimeline || combinedQueries?.filterQuery === undefined
                }
              />
              <EuiFlexItem grow={false}>
                <EuiToolTip content={i18n.CLOSE_TIMELINE_OR_TEMPLATE(timelineType === 'default')}>
                  <EuiButtonIcon
                    aria-label={i18n.CLOSE_TIMELINE_OR_TEMPLATE(timelineType === 'default')}
                    data-test-subj="close-timeline"
                    iconType="cross"
                    onClick={handleClose}
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const FlyoutHeaderPanel = React.memo(FlyoutHeaderPanelComponent);
