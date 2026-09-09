import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SkillForgeComponent } from './skill-forge.component';

describe('SkillForgeComponent', () => {
  let component: SkillForgeComponent;
  let fixture: ComponentFixture<SkillForgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SkillForgeComponent]
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
