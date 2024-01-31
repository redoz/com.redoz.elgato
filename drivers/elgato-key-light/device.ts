import Homey from 'homey';
import { ElgatoKeyLightClient } from './api';
import { DiscoveryResultMDNSSD } from 'homey/lib/DiscoveryStrategy';

class ElgatoKeyLightDevice extends Homey.Device {
  private _client?: ElgatoKeyLightClient;

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('MyDevice has been initialized');

    this.registerCapabilityListener("onoff", async (value: boolean) => {
      await this._client?.setState({ on: value });
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
    this._client = new ElgatoKeyLightClient(`http://${discoveryResult.address}:${discoveryResult.port}`);
    var currentState = await this._client.getCurrentState();
    this.log("currentState", currentState);
    this.setCapabilityValue("onoff", currentState.on).catch(this.error)
    
    // await this.api.connect(); // When this throws, the device will become unavailable.
  }

  onDiscoveryAddressChanged(discoveryResult: DiscoveryResultMDNSSD) {
    this.log("onDiscoveryAddressChanged", discoveryResult)
    // Update your connection details here, reconnect when the device is offline
    
    this._client = new ElgatoKeyLightClient(`http://${discoveryResult.address}:${discoveryResult.port}`);
    // this.api.reconnect().catch(this.error); 
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
    oldSettings: { [key: string]: boolean | string | number | undefined | null };
    newSettings: { [key: string]: boolean | string | number | undefined | null };
    changedKeys: string[];
  }): Promise<string | void> {
    this.log("MyDevice settings where changed");
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name: string) {
    this.log('MyDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('MyDevice has been deleted');
  }

}

module.exports = ElgatoKeyLightDevice;
