import { RestClient } from 'typed-rest-client/RestClient';



interface ElgatoKeyLightMessage {
    numberOfLights: number;
    lights: Array<{
        on: number;
        brightness: number;
        temperature: number
    }>;
}

// type JSONResponse = {
//     data?: ElgatoKeyLightMessage
//     errors?: Array<{message: string}>
//   }

export class ElgatoKeyLightClient {
    private _httpClient: RestClient;
    private _baseUri: string;

    constructor(baseUri: string) {
        this._baseUri = baseUri;
        this._httpClient = new RestClient('elgato-key-light-client', this._baseUri);
    }

    public async getCurrentState(): Promise<ElgatoKeyLightState> {
        var response = await this._httpClient.get<ElgatoKeyLightMessage>(`elgato/lights`)
        console.log(response.result)
        const light = response.result!.lights[0];
        return {
            on: light.on === 1,
            brightness: light.brightness,
            temperature: light.temperature
        }
    }

    public async setState(state: Partial<ElgatoKeyLightState>) {
        console.log("setState", state);
        var payload : any = {};
        if (state.on !== undefined)
        {
            payload.on = state.on === true ? 1 : 0;
        }

        var request = {
            "lights": [
                payload
            ]
        };

        console.log("request", request);

        var response = await this._httpClient.replace<ElgatoKeyLightMessage>(`elgato/lights`, request);

        console.log("update", response);
    }
}

export interface ElgatoKeyLightState {
    on: boolean;
    brightness: number;
    temperature: number
}