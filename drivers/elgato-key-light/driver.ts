import Homey from 'homey';

class ElgatoKeyLightDriver extends Homey.Driver {

  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
    this.log('ElgatoKeyLightDriver has been initialized');
    super.onInit();
  }

  /**
   * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
  async onPairListDevices() {
    this.log("discovering");
    const discoveryStrategy = this.getDiscoveryStrategy();
    const discoveryResults = discoveryStrategy.getDiscoveryResults();
    this.log("discovery result", discoveryResults);
    const devices = Object.values(discoveryResults).map(discoveryResult => {
      let txt = (discoveryResult as Homey.DiscoveryResultMDNSSD).txt as any;
      return {
        name: txt.name,
        data: {
          id: discoveryResult.id,
        },
      };
    });

    return devices;
  }

}

module.exports = ElgatoKeyLightDriver;
