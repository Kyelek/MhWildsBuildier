import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideTranslateService } from '@ngx-translate/core';

import { SkillForgeComponent } from './skill-forge.component';

describe('SkillForgeComponent', () => {
  let component: SkillForgeComponent;
  let fixture: ComponentFixture<SkillForgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkillForgeComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTranslateService({ lang: 'en', fallbackLang: 'en' })
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SkillForgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
