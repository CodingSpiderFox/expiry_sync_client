import { Injectable } from '@angular/core';
import { AlertController, ToastController, Toast } from 'ionic-angular';
import { ExpirySync } from '../app.expiry-sync';

@Injectable()
export class UiHelper {
  constructor (private alertCtrl:AlertController, private toastCtrl:ToastController) {}


  confirm(message:string):Promise<boolean> {
    return new Promise<boolean>(async resolve => {
      let app:ExpirySync = ExpirySync.getInstance();
      this.alertCtrl.create({
        message: message,
        buttons: [
          {
            text: await app.translate('yes'),
            handler: () => {
              resolve(true);
            }
          },
          {
            text: await app.translate('no'),
            handler: () => {
              resolve(false);
            }
          }
        ]
      }).present();
    });
  }

  toast(message:string, cssClass?:string):Toast {
    let toast:Toast = this.toastCtrl.create({
      message: message,
      duration: 3000,
      cssClass: cssClass
    });

    toast.present();
    return toast;
  }

  errorToast(message:string):Toast {
    return this.toast(message, 'error');
  }
}