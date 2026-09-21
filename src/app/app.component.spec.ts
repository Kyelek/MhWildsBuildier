import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { AppComponent } from './app.component';
import { routes } from './app.routes';
import { WildsApiService } from './core/services/wilds-api.service';

describe('AppComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        provideTranslateService({ lang: 'en', fallbackLang: 'en' })
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('pone el idioma de la app y de la API en español al arrancar', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const translateService = TestBed.inject(TranslateService);
    const wildsApi = TestBed.inject(WildsApiService);

    expect(translateService.getCurrentLang()).toEqual('es');
    expect(wildsApi.locale()).toEqual('es');
  });
});
