// @flow

// $FlowFixMe
const createRequest = require('./createRequest');
// $FlowFixMe
const identityService = require('./identityService');

module.exports = pub;

/*::
import type {
    RequestParams,
    GatewayHeaders,
    OutsideRequestParams,
    MtgResponse,
    AuthHeaders,
    CreateRequestOptions,
    GatewayConfig,
    AccessToken
} from './types'
*/

const mkOutsideRequestParams/*: (RequestParams, GatewayHeaders, AuthHeaders) => OutsideRequestParams */ = 
	(requestParams, gatewayHeaders, authHeaders) => 
({
	...requestParams,
	// $FlowFixMe
	headers: {
		...requestParams.headers,
		...gatewayHeaders,
		...authHeaders
	}
});

const mkAuthHeaders = (accessToken/*: AccessToken*/)/*: AuthHeaders */ =>
	({ authorization: `MTG-AT ${accessToken}` });

const mkGatewayHeaders = ()/*: GatewayHeaders */ => ({
	'X-Gateway-Throttling': 'disabled'
});

// TODO: move it to identityService
const authorize/*: (config: GatewayConfig) => Promise< AccessToken > */ = (config) =>
	identityService.getAccessToken(config)
	.catch((err) => {
		identityService.removeAccessToken(config.identityName);
		throw err;
	});

const pub/*: ({| ...CreateRequestOptions, gatewayConfig: GatewayConfig |}) => (RequestParams => Promise<MtgResponse>) */ = (config) => {
    // $FlowFixMe
    const request = createRequest(config);

    return async (requestParams/* RequestParams */)/*: Promise<MtgResponse> */ => {
        const accessToken = await authorize(config.gatewayConfig);
        const outsideRequestParams = mkOutsideRequestParams(
            requestParams, mkGatewayHeaders(), mkAuthHeaders(accessToken)
        );
        // $FlowFixMe
        const response = await request(outsideRequestParams);
        if (response.statusCode === 401) {
            identityService.removeAccessToken(config.gatewayConfig.identityName);
            const accessToken2 = await authorize(config.gatewayConfig);
            const outsideRequestParams2 = mkOutsideRequestParams(
                requestParams, mkGatewayHeaders(), mkAuthHeaders(accessToken2)
            );
            // $FlowFixMe
            return request(outsideRequestParams2);
        } else {
            return response;
        };
    }
}
