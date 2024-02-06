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

interface ElgatoLightSettingsMessage {
    powerOnBehavior: number
    powerOnBrightness: number
    powerOnTemperature: number
}


export class ElgatoKeyLightClient {
    private _httpClient: RestClient;
    private _baseUri: string;

    constructor(host: string, port: number) {
        this.host = host;
        this._baseUri = `http://${host}:${port}`;
        this._httpClient = new RestClient('com.redoz.elgato/1', this._baseUri);
    }

    public readonly host: string;

    public static readonly maxKelvinTemperature : number = 7000;
    public static readonly minKelvinTemperature : number = 2900;

    public static convertPercentageToKelvin(value: number) : number {
        const range = ElgatoKeyLightClient.maxKelvinTemperature - ElgatoKeyLightClient.minKelvinTemperature;
        var kelvin = range * value + ElgatoKeyLightClient.minKelvinTemperature;
        // clamp the return value
        return Math.min(ElgatoKeyLightClient.maxKelvinTemperature, Math.max(ElgatoKeyLightClient.minKelvinTemperature, kelvin))
    }   

    public static convertKelvinToPercentage(value: number) : number {
        const range = ElgatoKeyLightClient.maxKelvinTemperature - ElgatoKeyLightClient.minKelvinTemperature;
        const relative = value - ElgatoKeyLightClient.minKelvinTemperature;
        const percentage = relative / range;
        // clamp the return value
        return Math.min(0, Math.max(1, percentage))
    }

    public async setName(name: string) : Promise<ElgatoDeviceInfo> {
        let request : Pick<ElgatoDeviceInfoResponse, 'displayName'> = { displayName: name };
        console.log("request", request);
        var response = await this._httpClient.replace<ElgatoDeviceInfoResponse>(`elgato/accessory-info`, request);
        console.log("response", response)
        if (response.statusCode !== 200) {
            throw `Unexpected status code ${response.statusCode} returned from '${this._baseUri}/elgato/accessory-info'`
        }
        return ElgatoKeyLightClient.mapToDeviceInfo(response.result!)        
    }

    public async getDeviceInfo(): Promise<ElgatoDeviceInfo> {
        var response = await this._httpClient.get<ElgatoDeviceInfoResponse>(`elgato/accessory-info`)
        console.log(response.result)
        if (response.statusCode !== 200) {
            throw `Unexpected status code ${response.statusCode} returned from '${this._baseUri}/elgato/lights'`
        }
        return ElgatoKeyLightClient.mapToDeviceInfo(response.result!)

    }

    public async getCurrentState(): Promise<ElgatoKeyLightState> {
        var response = await this._httpClient.get<ElgatoKeyLightMessage>(`elgato/lights`)
        console.log(response.result)
        if (response.statusCode !== 200) {
            throw `Unexpected status code ${response.statusCode} returned from '${this._baseUri}/elgato/lights'`
        }
        return ElgatoKeyLightClient.mapToState(response.result!)
    }

    public async setState(state: Partial<ElgatoKeyLightState>): Promise<ElgatoKeyLightState> {
        console.log("setState", state);
        var payload: any = {};

        if (state.on !== undefined) {
            payload.on = state.on === true ? 1 : 0;
        }

        if (state.temperature !== undefined) {
            // yeah this is a bit clunky, maybe I'll clean this later, I wasn't expecting Homey to send 0-1 values
            payload.temperature = ElgatoKeyLightClient.mapToDeviceTemperature(state.temperature);
        }

        if (state.brightness !== undefined) {
            payload.brightness = ElgatoKeyLightClient.mapToDeviceBrightness(state.brightness);
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
        return ElgatoKeyLightClient.mapToState(response.result!)
    }

    public async getSettings() : Promise<ElgatoLightSettings> {
        var response = await this._httpClient.get<ElgatoLightSettingsMessage>('elgato/lights/settings')
        if (response.statusCode !== 200) {
            throw `Unexpected status code ${response.statusCode} returned from '${this._baseUri}/elgato/lights/settings'`
        }
        console.log("getSettings", response.result);
        let settings = ElgatoKeyLightClient.mapToSettings(response.result!)
        console.log("mappedSettings", settings);
        return settings;
    }

    static mapToSettings(message: ElgatoLightSettingsMessage) : ElgatoLightSettings {
        return {
            powerOnBehavior: ElgatoKeyLightClient.mapFromDevicePowerOnBehavior(message.powerOnBehavior),
            powerOnBrightness: ElgatoKeyLightClient.mapFromDeviceBrightness(message.powerOnBrightness),
            powerOnTemperature: ElgatoKeyLightClient.mapFromDeviceTemperature(message.powerOnTemperature)
        }
    }

    static mapToState(message: ElgatoKeyLightMessage): ElgatoKeyLightState {
        console.assert(message.lights.length === 1, `Expected exactly 1 item for 'message.lights[]'`);

        const light = message.lights[0];
        return {
            on: light.on === 1,
            brightness: ElgatoKeyLightClient.mapFromDeviceBrightness(light.brightness),
            temperature: ElgatoKeyLightClient.mapFromDeviceTemperature(light.temperature)
        }
    }

    static mapToDeviceInfo(message: ElgatoDeviceInfoResponse): ElgatoDeviceInfo {
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

    static mapFromDevicePowerOnBehavior(value: number) : ElgatoPowerOnBehavior {
        if (value === 1)
            return ElgatoPowerOnBehavior.RestoreLastUsedSettings;
        if (value === 2)
            return ElgatoPowerOnBehavior.RestoreDefaults;
        
        throw `Invalid device power on behavior value ${value}, expected 1 or 2`
    }

    static mapToDevicePowerOnBehavior(value: ElgatoPowerOnBehavior) : number {

        if (value === ElgatoPowerOnBehavior.RestoreLastUsedSettings)
            return 1;
        if (value === ElgatoPowerOnBehavior.RestoreDefaults)
            return 2;
        
        throw `Invalid power on behavior value ${value}, expected ${ElgatoPowerOnBehavior.RestoreLastUsedSettings} or ${ElgatoPowerOnBehavior.RestoreLastUsedSettings}`
    }


    static mapToDeviceTemperature(percentage: number): number {
        const range = 343 - 143;
        var absolute = 143 + percentage * range;
        // clamp value
        return Math.round(Math.min(343, Math.max(143, absolute)));
    }

    static mapFromDeviceTemperature(temperature: number): number {
        var relative = temperature - 143
        var percentage = relative / (343-143);
        // clamp value
        var result = Math.min(1, Math.max(0, percentage));
        result = Math.round(result * 100) / 100;
        console.log(`mapFromDeviceTemperature(${temperature}) => ${result}`)
        return result;
    }

    static mapFromDeviceBrightness(brightness: number) : number {
        var relative = brightness - 3
        var percentage = relative / (100 - 3);
        var result = Math.min(1, Math.max(0, percentage));
        result = Math.round(result * 100) / 100;
        console.log(`mapFromDeviceBrightness(${brightness}) => ${result}`)
        return result;
    }

    static mapToDeviceBrightness(percentage: number) : number {
        const range = 100 - 3;
        var absolute = 3 + percentage * range;
        let clampedValue = Math.min(100, Math.max(3, absolute));
        return Math.round(clampedValue);
    }
}

export enum ElgatoPowerOnBehavior {
    RestoreLastUsedSettings,
    RestoreDefaults
}

export interface ElgatoLightSettings {
    powerOnBehavior: ElgatoPowerOnBehavior,
    powerOnBrightness: number,
    powerOnTemperature: number,
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