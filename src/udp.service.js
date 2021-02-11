'use strict';

const dgram = require('dgram');


class UdpService {

  constructor(context) {
    this.context = context;
    this.socket = dgram.createSocket('udp4');
  }

  async sendData(data) {
    try {
      
      this.socket.send(data, this.context.port, this.context.address, (error, response) => {

        if(error) {
          console.log('UDP传输协议错误', error);
          throw error;
        }

        console.log('UDP错误应答', response);
      });

    } catch (error) {
      console.log('[-] ERROR: 无法发送数据到InfluxDB', error);
    }
  }

  close() {
    this.socket.close();
  }

};

module.exports = UdpService;