/**
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright IBM Corporation 2018
 */

/* eslint-env mocha */

import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import nock from 'nock';
import expect from 'expect';
import rewire from 'rewire';
import { fromJS, Map } from 'immutable';
import * as JobNodes from '../../WebContent/js/actions/jobNodes';
import * as snackbar from '../../WebContent/js/actions/snackbarNotifications';
import { LOCAL_HOST_ENDPOINT as BASE_URL } from '../testResources/hostConstants';

import * as jobNodesResources from '../testResources/actions/jobNodesResources';
import * as filtersResources from '../testResources/actions/filters';

describe('Action: jobNodes', () => {
    afterEach(() => {
        nock.cleanAll();
    });

    // Use Rewire to export private functions
    const rewiredJobNodes = rewire('../../WebContent/js/actions/jobNodes');

    const middlewares = [thunk];
    const mockStore = configureMockStore(middlewares);

    describe('toggle', () => {
        it('Should create an action to invert isToggled of a job', () => {
            const expectedJobId = 'JOB1234';
            const expectedAction = {
                type: JobNodes.TOGGLE_JOB,
                jobId: expectedJobId,
            };
            expect(JobNodes.toggleJob(expectedJobId)).toEqual(expectedAction);
        });
    });

    describe('fetchJobs', () => {
        it('Should create an action to request and receive jobs given valid filters', () => {
            const expectedActions = [
                {
                    type: JobNodes.REQUEST_JOBS,
                    filters: filtersResources.filters,
                },
                {
                    type: JobNodes.RECEIVE_JOBS,
                    jobs: jobNodesResources.jobFetchResponse,
                },
            ];

            const rewiredGetURIQuery = rewiredJobNodes.__get__('getURIQuery');
            nock(BASE_URL)
                .get(`/jobs${rewiredGetURIQuery(filtersResources.filters)}`)
                .reply(200, jobNodesResources.jobFetchResponse);
            const store = mockStore();
            return store.dispatch(JobNodes.fetchJobs(filtersResources.filters))
                .then(() => {
                    expect(store.getActions()).toEqual(expectedActions);
                });
        });

        it('Should create an action to request and invalidate jobs due to failed fetch', () => {
            const fetchJobsFailMessage = rewiredJobNodes.__get__('FETCH_JOBS_FAIL_MESSAGE');
            const expectedActions = [
                {
                    type: JobNodes.REQUEST_JOBS,
                    filters: filtersResources.filters,
                },
                {
                    type: snackbar.PUSH_NOTIFICATION_MESSAGE,
                    message: Map({
                        message: `${fetchJobsFailMessage}`,
                    }),
                },
                {
                    type: JobNodes.INVALIDATE_JOBS,
                },
            ];

            const rewiredGetURIQuery = rewiredJobNodes.__get__('getURIQuery');
            nock(BASE_URL)
                .get(`/jobs${rewiredGetURIQuery(filtersResources.filters)}`)
                .reply(500, '');
            const store = mockStore();
            return store.dispatch(JobNodes.fetchJobs(filtersResources.filters))
                .then(() => {
                    expect(store.getActions()).toEqual(expectedActions);
                });
        });
    });

    describe('fetchJobFilesAndSteps', () => {
        it('Should create actions to request files and steps, toggle job, received files and recevie steps', () => {
            const expectedActions = [
                {
                    type: JobNodes.REQUEST_JOB_FILES_AND_STEPS,
                    jobName: jobNodesResources.jobName,
                    jobId: jobNodesResources.jobId,
                },
                {
                    type: JobNodes.TOGGLE_JOB,
                    jobId: jobNodesResources.jobId,
                },
                {
                    type: JobNodes.RECEIVE_JOB_FILES,
                    jobName: jobNodesResources.jobName,
                    jobId: jobNodesResources.jobId,
                    jobFiles: jobNodesResources.jobFiles,
                },
                {
                    type: JobNodes.RECEIVE_JOB_STEPS,
                    jobName: jobNodesResources.jobName,
                    jobId: jobNodesResources.jobId,
                    jobSteps: jobNodesResources.jobSteps,
                },
                {
                    type: JobNodes.STOP_REFRESH_ICON,
                },
            ];

            nock(BASE_URL)
                .get(`/jobs/${jobNodesResources.jobName}/ids/${jobNodesResources.jobId}/files`)
                .reply(200, jobNodesResources.jobFiles);
            nock(BASE_URL)
                .get(`/jobs/${jobNodesResources.jobName}/ids/${jobNodesResources.jobId}/steps`)
                .reply(200, jobNodesResources.jobSteps);

            const store = mockStore();
            return store.dispatch(JobNodes.fetchJobFilesAndSteps(jobNodesResources.jobName, jobNodesResources.jobId)).then(() => {
                expect(store.getActions()).toEqual(expectedActions);
            });
        });

        it('Should create actions to request files and steps, toggle job, received files but no steps due to not found', () => {
            const expectedActions = [
                {
                    type: JobNodes.REQUEST_JOB_FILES_AND_STEPS,
                    jobName: jobNodesResources.jobName,
                    jobId: jobNodesResources.jobId,
                },
                {
                    type: JobNodes.TOGGLE_JOB,
                    jobId: jobNodesResources.jobId,
                },
                {
                    type: JobNodes.RECEIVE_JOB_FILES,
                    jobName: jobNodesResources.jobName,
                    jobId: jobNodesResources.jobId,
                    jobFiles: jobNodesResources.jobFiles,
                },
                {
                    type: JobNodes.STOP_REFRESH_ICON,
                },
            ];

            nock(BASE_URL)
                .get(`/jobs/${jobNodesResources.jobName}/ids/${jobNodesResources.jobId}/files`)
                .reply(200, jobNodesResources.jobFiles);
            nock(BASE_URL)
                .get(`/jobs/${jobNodesResources.jobName}/ids/${jobNodesResources.jobId}/steps`)
                .reply(404, []);

            const store = mockStore();
            return store.dispatch(JobNodes.fetchJobFilesAndSteps(jobNodesResources.jobName, jobNodesResources.jobId)).then(() => {
                expect(store.getActions()).toEqual(expectedActions);
            });
        });

        it('Should create actions to request files and steps, toggle job, received files and message due to server error on steps', () => {
            const fetchStepsFail = rewiredJobNodes.__get__('FETCH_JOB_STEPS_FAIL_MESSAGE');
            const expectedActions = [
                {
                    type: JobNodes.REQUEST_JOB_FILES_AND_STEPS,
                    jobName: jobNodesResources.jobName,
                    jobId: jobNodesResources.jobId,
                },
                {
                    type: JobNodes.TOGGLE_JOB,
                    jobId: jobNodesResources.jobId,
                },
                {
                    type: JobNodes.RECEIVE_JOB_FILES,
                    jobName: jobNodesResources.jobName,
                    jobId: jobNodesResources.jobId,
                    jobFiles: jobNodesResources.jobFiles,
                },
                {
                    type: snackbar.PUSH_NOTIFICATION_MESSAGE,
                    message: Map({
                        message: `${fetchStepsFail} ${jobNodesResources.jobName}:${jobNodesResources.jobId}`,
                    }),
                },
                {
                    type: JobNodes.STOP_REFRESH_ICON,
                },
            ];

            nock(BASE_URL)
                .get(`/jobs/${jobNodesResources.jobName}/ids/${jobNodesResources.jobId}/files`)
                .reply(200, jobNodesResources.jobFiles);
            nock(BASE_URL)
                .get(`/jobs/${jobNodesResources.jobName}/ids/${jobNodesResources.jobId}/steps`)
                .reply(500, '');

            const store = mockStore();
            return store.dispatch(JobNodes.fetchJobFilesAndSteps(jobNodesResources.jobName, jobNodesResources.jobId)).then(() => {
                expect(store.getActions()).toEqual(expectedActions);
            });
        });

        it('Should create actions to request files and steps, toggle job, received steps and message due to server error on files', () => {
            const fetchFilesFail = rewiredJobNodes.__get__('FETCH_JOB_FILES_FAIL_MESSAGE');
            const expectedActions = [
                {
                    type: JobNodes.REQUEST_JOB_FILES_AND_STEPS,
                    jobName: jobNodesResources.jobName,
                    jobId: jobNodesResources.jobId,
                },
                {
                    type: JobNodes.TOGGLE_JOB,
                    jobId: jobNodesResources.jobId,
                },
                {
                    type: snackbar.PUSH_NOTIFICATION_MESSAGE,
                    message: Map({
                        message: `${fetchFilesFail} ${jobNodesResources.jobName}:${jobNodesResources.jobId}`,
                    }),
                },
                {
                    type: JobNodes.RECEIVE_JOB_STEPS,
                    jobName: jobNodesResources.jobName,
                    jobId: jobNodesResources.jobId,
                    jobSteps: jobNodesResources.jobSteps,
                },
                {
                    type: JobNodes.STOP_REFRESH_ICON,
                },
            ];

            nock(BASE_URL)
                .get(`/jobs/${jobNodesResources.jobName}/ids/${jobNodesResources.jobId}/files`)
                .reply(500, '');
            nock(BASE_URL)
                .get(`/jobs/${jobNodesResources.jobName}/ids/${jobNodesResources.jobId}/steps`)
                .reply(200, jobNodesResources.jobSteps);

            const store = mockStore();
            return store.dispatch(JobNodes.fetchJobFilesAndSteps(jobNodesResources.jobName, jobNodesResources.jobId)).then(() => {
                expect(store.getActions()).toEqual(expectedActions);
            });
        });
    });

    describe('purgeJob', () => {
        it('Should create an action to request a job purge and then receive validation', () => {
            const purgeFail = rewiredJobNodes.__get__('PURGE_JOB_SUCCESS_MESSAGE');

            const expectedActions = [{
                type: JobNodes.REQUEST_PURGE_JOB,
                jobName: jobNodesResources.jobName,
                jobId: jobNodesResources.jobId,
            },
            {
                type: snackbar.PUSH_NOTIFICATION_MESSAGE,
                message: Map({
                    message: `${purgeFail} ${jobNodesResources.jobName}/${jobNodesResources.jobId}`,
                }),
            },
            {
                type: JobNodes.RECEIVE_PURGE_JOB,
                jobName: jobNodesResources.jobName,
                jobId: jobNodesResources.jobId,
            }];

            const node = new Map();
            node.set('label', jobNodesResources.jobId);


            const store = mockStore(fromJS({
                treeNodesJobs: {
                    jobs: node,
                },
            }));

            nock(BASE_URL)
                .delete(`/${jobNodesResources.jobName}/${jobNodesResources.jobId}`)
                .reply(200, '');

            return store.dispatch(JobNodes.purgeJob(jobNodesResources.jobName, jobNodesResources.jobId))
                .then(() => {
                    expect(store.getActions()).toEqual(expectedActions);
                });
        });

        it('Should create an action to request a job purge and then invalidate', () => {
            const purgeFail = rewiredJobNodes.__get__('PURGE_JOB_FAIL_MESSAGE');

            const expectedActions = [{
                type: JobNodes.REQUEST_PURGE_JOB,
                jobName: jobNodesResources.jobName,
                jobId: jobNodesResources.jobId,
            },
            {
                type: snackbar.PUSH_NOTIFICATION_MESSAGE,
                message: Map({
                    message: `${purgeFail} ${jobNodesResources.jobName}/${jobNodesResources.jobId}`,
                }),
            },
            {
                type: JobNodes.INVALIDATE_PURGE_JOB,
                jobName: jobNodesResources.jobName,
                jobId: jobNodesResources.jobId,
            }];

            const node = new Map();
            node.set('label', jobNodesResources.jobId);


            const store = mockStore(fromJS({
                treeNodesJobs: {
                    jobs: node,
                },
            }));

            nock(BASE_URL)
                .delete(`${jobNodesResources.jobName}/${jobNodesResources.jobId}`)
                .reply(404, '');

            return store.dispatch(JobNodes.purgeJob(jobNodesResources.jobName, jobNodesResources.jobId))
                .then(() => {
                    expect(store.getActions()).toEqual(expectedActions);
                });
        });
    });
});
