import { RestClient } from 'typed-rest-client/RestClient';



// https://github.com/adamesch/elgato-key-light-api/tree/master/resources/lights
interface ElgatoKeyLightMessage {
    numberOfLights: number;
    lights: Array<{
        on: number;
        brightness: number;
        temperature: number
    }>;
}

interface ElgatoDeviceInfoResponse {
    productName: string
    hardwareBoardType: number
    hardwareRevision: number
    macAddress: string
    firmwareBuildNumber: number
    firmwareVersion: string
    serialNumber: string
    displayName: string
    features: string[]
    "wifi-info": WifiInfoResponse
}

interface WifiInfoResponse {
    ssid: string
    frequencyMHz: number
    rssi: number
}


export class ElgatoKeyLightClient {
    private _httpClient: RestClient;
    private _baseUri: string;

    constructor(baseUri: string) {
        this._baseUri = baseUri;
        this._httpClient = new RestClient('com.redoz.elgato/1', this._baseUri);
    }

    public async setName(name: string) : Promise<ElgatoDeviceInfo> {
        let request : Pick<ElgatoDeviceInfoResponse, 'displayName'> = { displayName: name };
        console.log("request", request);
        var response = await this._httpClient.replace<ElgatoDeviceInfoResponse>(`elgato/accessory-info`, request);
        console.log("response", response)
        if (response.statusCode !== 200) {
            throw `Unexpected status code ${response.statusCode} returned from '${this._baseUri}/elgato/accessory-info'`
        }
        return this.mapToDeviceInfo(response.result!)        
    }

    public async getDeviceInfo(): Promise<ElgatoDeviceInfo> {
        var response = await this._httpClient.get<ElgatoDeviceInfoResponse>(`elgato/accessory-info`)
        console.log(response.result)
        if (response.statusCode !== 200) {
            throw `Unexpected status code ${response.statusCode} returned from '${this._baseUri}/elgato/lights'`
        }
        return this.mapToDeviceInfo(response.result!)

    }

    public async getCurrentState(): Promise<ElgatoKeyLightState> {
        var response = await this._httpClient.get<ElgatoKeyLightMessage>(`elgato/lights`)
        console.log(response.result)
        if (response.statusCode !== 200) {
            throw `Unexpected status code ${response.statusCode} returned from '${this._baseUri}/elgato/lights'`
        }
        return this.mapToState(response.result!)
    }

    public async setState(state: Partial<ElgatoKeyLightState>): Promise<ElgatoKeyLightState> {
        console.log("setState", state);
        var payload: any = {};

        if (state.on !== undefined) {
            payload.on = state.on === true ? 1 : 0;
        }

        if (state.temperature !== undefined) {
            payload.temperature = this.mapToLightTemperature(state.temperature);
        }

        if (state.brightness !== undefined) {
            payload.brightness = this.mapToLightBrightness(state.brightness);
        }

        var request = {
            "lights": [
                payload
            ]
        };

        console.log("request", request);

        var response = await this._httpClient.replace<ElgatoKeyLightMessage>(`elgato/lights`, request);

        if (response.statusCode !== 200) {
            throw `Unexpected status code ${response.statusCode} returned from '${this._baseUri}/elgato/lights'`
        }
        return this.mapToState(response.result!)
    }

    mapToState(message: ElgatoKeyLightMessage): ElgatoKeyLightState {
        console.assert(message.lights.length === 1, `Expected exactly 1 item for 'message.lights[]'`);

        const light = message.lights[0];
        return {
            on: light.on === 1,
            brightness: light.brightness,
            temperature: light.temperature
        }
    }

    mapToDeviceInfo(message: ElgatoDeviceInfoResponse): ElgatoDeviceInfo {
        return {
            productName: message.productName,
            hardwareBoardType: message.hardwareBoardType,
            hardwareRevision: message.hardwareRevision,
            macAddress: message.macAddress,
            firmwareBuildNumber: message.firmwareBuildNumber,
            firmwareVersion: message.firmwareVersion,
            serialNumber: message.serialNumber,
            displayName: message.displayName,
            features: message.features,
            wifiInfo: {
                ssid: message['wifi-info'].ssid,
                frequencyMHz: message['wifi-info'].frequencyMHz,
                rssi: message['wifi-info'].rssi
            }
        }
    }

    mapToLightTemperature(kelvin: number): number {
        let rawValue = kelvin * 0.05;
        let clampedValue = Math.min(343, Math.max(143, rawValue));
        return clampedValue;
    }

    mapToKelvin(lightTemperature: number): number {
        var rawValue = lightTemperature / 0.05;
        // noramzlie to incremenets of 50?
        return rawValue;
    }

    mapToLightBrightness(brightness: number) : number {
        var rawValue = brightness * 100;
        let clampedValue = Math.min(100, Math.max(0, rawValue));
        return clampedValue;
    }
}


export interface ElgatoKeyLightState {
    on: boolean;
    
    brightness: number;
    temperature: number
}

export interface ElgatoDeviceInfo {
    productName: string
    hardwareBoardType: number
    hardwareRevision: number
    macAddress: string
    firmwareBuildNumber: number
    firmwareVersion: string
    serialNumber: string
    displayName: string
    features: string[]
    wifiInfo: WifiInfo
}

export interface WifiInfo {
    ssid: string
    frequencyMHz: number
    rssi: number
}