import { TestBed } from '@angular/core/testing';
import { ConfigService } from '../../../services/config.service';
import { Config } from './config';

describe('Config', () => {
  beforeEach(async () => {
    localStorage.removeItem('itp-config');
    await TestBed.configureTestingModule({
      imports: [Config],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Config);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should open and close the panel with the trigger button', async () => {
    const fixture = TestBed.createComponent(Config);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    const button = root.querySelector<HTMLButtonElement>('button[aria-controls="config-panel"]')!;
    const aside = root.querySelector<HTMLElement>('#config-panel')!;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(aside.classList.contains('translate-x-full')).toBe(true);
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(aside.classList.contains('translate-x-0')).toBe(true);
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(aside.classList.contains('translate-x-full')).toBe(true);
  });

  it('should toggle the map tooltip preference from the panel', async () => {
    const fixture = TestBed.createComponent(Config);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    const config = TestBed.inject(ConfigService);
    expect(config.tooltipMapa()).toBe(true);
    const input = root.querySelector<HTMLInputElement>('input[aria-label="Tooltips al pasar el cursor"]')!;
    input.click();
    fixture.detectChanges();
    expect(config.tooltipMapa()).toBe(false);
    config.reset();
    fixture.detectChanges();
    expect(config.tooltipMapa()).toBe(true);
  });

  it('should close the panel when pressing Escape', async () => {
    const fixture = TestBed.createComponent(Config);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-controls="config-panel"]',
    )!;
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
});
