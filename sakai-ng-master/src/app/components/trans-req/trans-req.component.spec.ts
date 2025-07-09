import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TransReqComponent } from './trans-req.component';

describe('TransReqComponent', () => {
  let component: TransReqComponent;
  let fixture: ComponentFixture<TransReqComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransReqComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TransReqComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
