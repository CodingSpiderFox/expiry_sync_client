import { Component, ViewChild, ApplicationRef } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ExpirySync } from '../../../../app/app.expiry-sync';
import { NavParams, ViewController } from 'ionic-angular';
import { Location, User, LocationShare } from '../../../../app/models';
import { ValidationError, LocationShareRemovalRefused } from '../../../../app/utils/api-server';
import { UiHelper } from '../../../../app/utils/ui-helper';
import { ExpirySyncController } from '../../../../app/app.expiry-sync-controller';
import { TranslateService } from '@ngx-translate/core';

@Component({
  templateUrl: 'location-shares.html'
})
export class LocationSharesModal extends ExpirySyncController {
  app: ExpirySync;

  location: Location;
  locationId: string;
  shareUser: User = new User();
  serverValidationErrors: any = {};
  @ViewChild('shareForm') currentForm: NgForm;

  shares: Array<LocationShare>;

  constructor(private params: NavParams, private viewCtrl: ViewController, private uiHelper: UiHelper, translate:TranslateService, private appRef:ApplicationRef) {
    super(translate);
    this.app = ExpirySync.getInstance();

    this.locationId = params.get('location-id');

    ExpirySync.ready().then(async () => {
      await this.showList();
    });
  }

  dismiss() {
    this.viewCtrl.dismiss();
  }

  private setServerValidationErrors(e: ValidationError) {
    this.serverValidationErrors = e.errorData.errors;
    if (typeof(this.serverValidationErrors.email) !== "undefined") {
      this.serverValidationErrors.login = this.serverValidationErrors.email;
    }
    else if (typeof(this.serverValidationErrors.username) !== "undefined") {
      this.serverValidationErrors.login = this.serverValidationErrors.username;
    }
  }

  async addShare(valid: boolean) {
    this.shareUser = User.createFromLogin(this.shareUser.login);

    let existingShare: LocationShare = this.shares.find((curShare: LocationShare) => {
      return this.shareUser.isTheSame(curShare.user);
    });

    if (existingShare) {
      this.serverValidationErrors = { login: [await this.translate('\"\" is already in the list.', {user: this.shareUser.login})] };
      return;
    }

    let task: Symbol = this.app.loadingStarted('Adding user to location');
    try {
      this.shareUser = await this.location.addRemoteShare(this.shareUser);
      this.shareUser = await this.shareUser.updateOrAddByServerId();

      let share: LocationShare = new LocationShare();
      share.locationId = this.location.id;
      share.userId = this.shareUser.id;
      await share.save();
    }
    catch (e) {
      valid = false;
      if (e instanceof ValidationError) {
        this.setServerValidationErrors(e);
      }
      else {
        this.app.loadingDone(task);
        this.uiHelper.errorToast(await this.app.translate('We have trouble connecting to the server you chose. Are you connected to the internet?'));
        console.error(e);
        return;
      }
    }
    
    await this.showList();

    this.app.loadingDone(task);
    if (valid) {
      this.serverValidationErrors = {};
      this.uiHelper.toast(await this.translate('User has been added to \"\".', {location: this.location.name}));
    }
  }

  async removeTapped(share: LocationShare) {
    if (! await this.uiHelper.confirm(await this.translate('Do you really want to remove this user from \"\"?', {location: this.location.name}))) {
      return;
    }

    let task: Symbol = this.app.loadingStarted('Removing user from location');
    try {
      await share.requestRemoval();
      await share.delete();
      await this.showList();
      this.uiHelper.toast(await this.translate('User has been removed from \"\".', {location: this.location.name}));
    }
    catch (e) {
      if (e instanceof LocationShareRemovalRefused) {
        this.uiHelper.errorToast(e.response.json().errors.join("\n"));
      }
      else {
        this.app.loadingDone(task);
        this.uiHelper.errorToast(await this.translate('We have trouble connecting to the server you chose. Are you connected to the internet?'));
        console.error(e);
        return;
      }
    }

    this.app.loadingDone(task);
  }

  private async showList(): Promise<void> {
    if (!this.location) {
      try {
        this.location = <Location> await Location.findBy('id', this.locationId);
      }
      catch(e) {
        // This can happen, if a location in the list has been tapped during sync,
        // and was then deleted by sync:
        this.viewCtrl.dismiss();
      }
    }
    
    this.shares = <Array<LocationShare>> await LocationShare
      .all()
      .filter('locationId', '=', this.location.id)
      .prefetch('user')
      .prefetch('location')
      .list();
  }
}
