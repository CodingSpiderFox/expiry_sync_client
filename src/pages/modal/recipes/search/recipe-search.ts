import { Component } from '@angular/core';
import { ExpirySyncController } from '../../../../app/app.expiry-sync-controller';
import { NavParams, ViewController } from 'ionic-angular';
import { ProductEntry, Setting } from '../../../../app/models';
import { TranslateService } from '@ngx-translate/core';

interface RecipeKeyword {
  text: string,
  active: boolean
}

@Component({
  templateUrl: 'recipe-search.html'
})
export class RecipeSearchModal extends ExpirySyncController {
  keywords:Array<RecipeKeyword>;

  constructor(private params:NavParams, private viewCtrl:ViewController, translate:TranslateService) {
    super(translate);

    const selectedProductEntries:Array<ProductEntry> = <Array<ProductEntry>> params.get('selectedProductEntries');
    this.keywords = [];
    for (let productEntry of selectedProductEntries) {
      const articleWords = productEntry.article.name.split(/\s/g);
      for (let word of articleWords) {
        if (word.length > 1 && !this.includedInKeywords(word)) {
          this.keywords.push({text: word, active: true});
        }
      }
    }
  }

  private includedInKeywords(word:string):boolean {
    for (let keyword of this.keywords) {
      if (keyword.text.toLowerCase() == word.toLowerCase()) {
        return true;
      }
    }

    return false;
  }

  keywordTapped(keyword:RecipeKeyword) {
    keyword.active = !keyword.active;
  }

  dismiss() {
    this.viewCtrl.dismiss();
  }

  get activeKeywords():Array<RecipeKeyword> {
    return this.keywords.filter(keyword => keyword.active);
  }

  private get searchStr():string {
    return this.activeKeywords
        .map(keyword => keyword.text)
        .join(' ');
  }

  private async getSearchUrl():Promise<string> {
    const searchUrlTemplate = Setting.cached('searchUrl');
    let searchUrl = searchUrlTemplate.replace(/\{\{recipeTranslation\}\}/g, encodeURI(await this.translate('recipe')));
    const re = /\{\{ingredients\}\}/g;
    if (re.test(searchUrl)) {
      searchUrl = searchUrl.replace(re, encodeURI(this.searchStr))
    }
    else {
      searchUrl += encodeURI(this.searchStr);
    }
    return searchUrl;
  }

  async searchTapped() {
    this.viewCtrl.dismiss();

    window.open(await this.getSearchUrl());
  }
  
  selectAll(select = true) {
    for (let keyword of this.keywords) {
      keyword.active = select;
    }
  }
}
