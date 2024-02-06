import Homey from 'homey';
import { ElgatoKeyLightClient, ElgatoPowerOnBehavior } from './api';
import { DiscoveryResultMDNSSD } from 'homey/lib/DiscoveryStrategy';

interface LighSettings {
  power_on_behavior: string
  default_power_on_brightness: number
  default_power_on_temperature: number
}

interface AccessoryInfo {
  ssid: string
  band: string
  rssi: string
  product_name: string
  hardware_board_type: string
  hardware_revision: string
  mac_address: string
  firmware_build_number: string
  serial_number: string
  firmware_version: string
  ip_address: string
}

interface DeviceSettings extends LighSettings, AccessoryInfo {
}

class ElgatoKeyLightDevice extends Homey.Device {
  private _client?: ElgatoKeyLightClient;

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('ElgatoKeyLightDevice has been initialized');

    this.registerCapabilityListener("onoff", async (value: boolean) => {
      this.log("onoff", value);
      await this._client?.setState({ on: value });
    });

    
    this.registerCapabilityListener("light_temperature", async (value: number) => {
      this.log("light_temperature", value);
      await this._client?.setState({temperature: value});
    });

    this.registerCapabilityListener("dim", async (value: number) => {
      this.log("dim", value);
      await this._client?.setState({brightness: value});
    });
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('MyDevice has been added');
  }

  onDiscoveryResult(discoveryResult: any) {
    // Return a truthy value here if the discovery result matches your device.
    return discoveryResult.id === this.getData().id;
  }

  async onDiscoveryAvailable(discoveryResult: DiscoveryResultMDNSSD) {
    // This method will be executed once when the device has been found (onDiscoveryResult returned true)
    this.log("onDiscoveryAvailable", discoveryResult)
    this._client = new ElgatoKeyLightClient(discoveryResult.address, parseInt(discoveryResult.port));
    
    await this.syncDevice();
  }

  private async syncDevice() {
    if (this._client === undefined) {
      throw "Invalid operation, no client found"
    }

    var deviceInfo = await this._client.getDeviceInfo();
    var deviceSettings = await this._client.getSettings();

    let settings: Partial<DeviceSettings> = {
      power_on_behavior: ElgatoPowerOnBehavior[deviceSettings.powerOnBehavior],
      default_power_on_brightness: deviceSettings.powerOnBrightness * 100,
      default_power_on_temperature: ElgatoKeyLightClient.convertPercentageToKelvin(deviceSettings.powerOnTemperature),

      ssid: deviceInfo.wifiInfo.ssid,
      band: `${Math.round(deviceInfo.wifiInfo.frequencyMHz / 100) / 10} GHz`,
      rssi: deviceInfo.wifiInfo.rssi.toString(10),
      product_name: deviceInfo.productName,
      hardware_board_type: deviceInfo.hardwareBoardType.toString(10),
      hardware_revision: deviceInfo.hardwareRevision.toString(10),
      mac_address: deviceInfo.macAddress,
      serial_number: deviceInfo.serialNumber,
      firmware_version: `${deviceInfo.firmwareVersion} (${deviceInfo.firmwareBuildNumber.toString(10)})`,
      ip_address: this._client.host
    };

    this.log("settings", settings);
    
    await this.setSettings(settings).catch(this.error);

    var currentState = await this._client.getCurrentState();
    this.log("currentState", currentState);

    await this.setCapabilityValue("onoff", currentState.on).catch(this.error);
    await this.setCapabilityValue("dim", currentState.brightness).catch(this.error);
    await this.setCapabilityValue("light_temperature", currentState.temperature).catch(this.error);
  }

  async onDiscoveryAddressChanged(discoveryResult: DiscoveryResultMDNSSD) {
    this.log("onDiscoveryAddressChanged", discoveryResult)
    // Update your connection details here, reconnect when the device is offline
    
    this._client = new ElgatoKeyLightClient(discoveryResult.address, parseInt(discoveryResult.port));

    this.syncDevice();
  }

  onDiscoveryLastSeenChanged(discoveryResult: DiscoveryResultMDNSSD) {
    // When the device is offline, try to reconnect here
    // this.api.reconnect().catch(this.error); 
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings({
    oldSettings,
    newSettings,
    changedKeys,
  }: {
    oldSettings: Partial<DeviceSettings>;
    newSettings: Partial<DeviceSettings>;
    changedKeys: Array<keyof DeviceSettings>;
  }): Promise<string | void> {
    // TODO booooring 
    this.log("MyDevice settings where changed");
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name: string) {
    let trimmedName = name.trim();
    await this._client?.setName(trimmedName)
    this.log(`ElgatoKeyLightDevice was renamed to ${trimmedName}`);
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('MyDevice has been deleted');
  }

}

module.exports = ElgatoKeyLightDevice;
