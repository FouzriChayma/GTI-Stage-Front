import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransfertDetailsComponent } from './transfert-details.component';

describe('TransfertDetailsComponent', () => {
  let component: TransfertDetailsComponent;
  let fixture: ComponentFixture<TransfertDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransfertDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransfertDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
