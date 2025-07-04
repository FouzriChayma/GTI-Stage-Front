import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NewTransferRequestComponent } from './new-transfer-request.component';

describe('NewTransferRequestComponent', () => {
  let component: NewTransferRequestComponent;
  let fixture: ComponentFixture<NewTransferRequestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NewTransferRequestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NewTransferRequestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
