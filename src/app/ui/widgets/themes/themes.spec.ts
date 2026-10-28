import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ThemeService } from '../../../services/theme.service';
import { Themes } from './themes';

describe('Themes', () => {
  beforeEach(async () => {
    localStorage.removeItem('itp-theme');
    localStorage.removeItem('itp-accent');
    document.documentElement.classList.remove('dark');
    await TestBed.configureTestingModule({
      imports: [Themes],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Themes);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should open and close the panel with the trigger button', async () => {
    const fixture = TestBed.createComponent(Themes);
    fixture.detectChanges();
    const trigger: HTMLElement = fixture.nativeElement as HTMLElement;
    const button = trigger.querySelector<HTMLButtonElement>(
      'button[aria-controls="themes-panel"]',
    )!;
    const aside = trigger.querySelector<HTMLElement>('#themes-panel')!;
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

  it('should not block pointer events of the app when closed (overlay regression)', async () => {
    const fixture = TestBed.createComponent(Themes);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    const aside = root.querySelector<HTMLElement>('#themes-panel')!;
    const container = aside.parentElement!;
    const trigger = root.querySelector<HTMLButtonElement>(
      'button[aria-controls="themes-panel"]',
    )!;
    expect(container.classList.contains('pointer-events-none')).toBe(true);
    trigger.click();
    fixture.detectChanges();
    expect(container.classList.contains('pointer-events-none')).toBe(false);
    trigger.click();
    fixture.detectChanges();
    expect(container.classList.contains('pointer-events-none')).toBe(true);
  });

  it('should update the preview percentage when simulating', async () => {
    const fixture = TestBed.createComponent(Themes);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    const percent = root.querySelector<HTMLElement>('[data-testid="preview-percent"]')!;
    expect(percent.textContent).toContain('66%');
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    root.querySelector<HTMLElement>('[role="progressbar"]')!.click();
    fixture.detectChanges();
    expect(percent.textContent).toContain('95%');
    vi.restoreAllMocks();
  });

  it('should show feedback when clicking a preview button', async () => {
    const fixture = TestBed.createComponent(Themes);
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement as HTMLElement;
    const primary = Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find(
      (button) => button.textContent?.trim() === 'Primario',
    )!;
    expect(primary).toBeTruthy();
    primary.click();
    fixture.detectChanges();
    expect(primary.textContent).toContain('¡Hecho!');
    expect(primary.querySelector('.fa-check')).toBeTruthy();
  });

  it('should close the panel when pressing Escape', async () => {
    const fixture = TestBed.createComponent(Themes);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-controls="themes-panel"]',
    )!;
    button.click();
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });

  it('should switch appearance mode from the panel', async () => {
    const fixture = TestBed.createComponent(Themes);
    fixture.detectChanges();
    const theme = TestBed.inject(ThemeService);
    const darkButton = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>(
        'section button',
      ),
    ).find((button) => button.textContent?.includes('Oscuro'));
    if (!darkButton) {
      throw new Error('botón Oscuro no encontrado');
    }
    const previous = theme.mode();
    darkButton.click();
    fixture.detectChanges();
    expect(theme.mode()).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(theme.mode()).not.toBe(previous);
    theme.reset();
  });

  it('should select an accent color from the panel', async () => {
    const fixture = TestBed.createComponent(Themes);
    fixture.detectChanges();
    const theme = TestBed.inject(ThemeService);
    theme.setMode('light');
    fixture.detectChanges();
    const swatch = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-label="Ámbar"]',
    )!;
    expect(swatch.getAttribute('aria-pressed')).toBe('false');
    swatch.click();
    fixture.detectChanges();
    expect(theme.accentId()).toBe('amber');
    expect(swatch.getAttribute('aria-pressed')).toBe('true');
    expect(
      document.documentElement.style.getPropertyValue('--primary'),
    ).toBe('oklch(0.62 0.16 75)');
    theme.reset();
    fixture.detectChanges();
  });
});
