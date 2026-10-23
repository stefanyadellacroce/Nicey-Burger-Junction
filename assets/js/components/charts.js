let chartPromise;

const CHART_JS_URL = 'https://esm.sh/chart.js@4.5.0/auto';

async function Chart() {
  if (!chartPromise) {
    chartPromise = import(CHART_JS_URL).then(module => module.default);
  }
  return chartPromise;
}

function cssVar(name, fallback) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return fallback;
  }

  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  return value || fallback;
}

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

function hexToRgba(hex, alpha = 1) {
  const clean = String(hex).replace('#', '').trim();

  if (!/^[0-9a-f]{6}$/i.test(clean)) {
    return `rgba(180,35,24,${alpha})`;
  }

  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);

  return `rgba(${r},${g},${b},${alpha})`;
}

export function getChartTheme() {
  return {
    primary: cssVar('--nbj-primary', '#b42318'),
    secondary: cssVar('--nbj-secondary', '#ff7a00'),
    accent: cssVar('--nbj-accent', '#ffb000'),
    success: cssVar('--nbj-success', '#157347'),
    info: cssVar('--nbj-info', '#0b6fa4'),
    warning: cssVar('--nbj-warning', '#996300'),
    danger: cssVar('--nbj-danger', '#b42318'),
    text: cssVar('--nbj-text', '#2c211c'),
    muted: cssVar('--nbj-muted', '#72645d'),
    border: cssVar('--nbj-border', '#eadfd3'),
    surface: cssVar('--nbj-surface', '#ffffff')
  };
}

function getFontFamily() {
  return cssVar(
    '--nbj-font',
    'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  );
}

function baseOptionsFactory() {
  const theme = getChartTheme();
  const reducedMotion = prefersReducedMotion();

  return {
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 120,

    interaction: {
      mode: 'index',
      intersect: false
    },

    animation: reducedMotion
      ? false
      : {
          duration: 650,
          easing: 'easeOutQuart'
        },

    animations: reducedMotion
      ? {}
      : {
          colors: {
            duration: 350
          },
          numbers: {
            duration: 650,
            easing: 'easeOutQuart'
          }
        },

    plugins: {
      legend: {
        position: 'bottom',
        align: 'center',

        labels: {
          color: theme.muted,
          usePointStyle: true,
          pointStyle: 'circle',
          boxWidth: 8,
          boxHeight: 8,
          padding: 18,

          font: {
            family: getFontFamily(),
            size: 12,
            weight: '600'
          }
        }
      },

      tooltip: {
        enabled: true,
        displayColors: true,
        usePointStyle: true,
        padding: 12,
        cornerRadius: 10,
        caretPadding: 8,

        backgroundColor: 'rgba(36,25,21,.94)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255,255,255,.10)',
        borderWidth: 1,

        titleFont: {
          family: getFontFamily(),
          size: 13,
          weight: '700'
        },

        bodyFont: {
          family: getFontFamily(),
          size: 12,
          weight: '500'
        }
      }
    },

    scales: {
      x: {
        grid: {
          display: false,
          drawBorder: false
        },

        border: {
          display: false
        },

        ticks: {
          color: theme.muted,
          maxRotation: 0,
          autoSkip: true,
          padding: 8,

          font: {
            family: getFontFamily(),
            size: 11,
            weight: '600'
          }
        }
      },

      y: {
        beginAtZero: true,

        grid: {
          color: hexToRgba(theme.border, 0.72),
          drawTicks: false
        },

        border: {
          display: false
        },

        ticks: {
          color: theme.muted,
          padding: 10,
          precision: 0,

          font: {
            family: getFontFamily(),
            size: 11,
            weight: '600'
          }
        }
      }
    }
  };
}

export const baseOptions = baseOptionsFactory();

export function createBaseOptions(overrides = {}) {
  const base = baseOptionsFactory();

  return {
    ...base,
    ...overrides,

    interaction: {
      ...base.interaction,
      ...(overrides.interaction || {})
    },

    plugins: {
      ...base.plugins,
      ...(overrides.plugins || {}),

      legend: {
        ...base.plugins.legend,
        ...(overrides.plugins?.legend || {}),

        labels: {
          ...base.plugins.legend.labels,
          ...(overrides.plugins?.legend?.labels || {})
        }
      },

      tooltip: {
        ...base.plugins.tooltip,
        ...(overrides.plugins?.tooltip || {})
      }
    },

    scales: {
      ...base.scales,
      ...(overrides.scales || {}),

      x: {
        ...base.scales.x,
        ...(overrides.scales?.x || {}),

        ticks: {
          ...base.scales.x.ticks,
          ...(overrides.scales?.x?.ticks || {})
        },

        grid: {
          ...base.scales.x.grid,
          ...(overrides.scales?.x?.grid || {})
        }
      },

      y: {
        ...base.scales.y,
        ...(overrides.scales?.y || {}),

        ticks: {
          ...base.scales.y.ticks,
          ...(overrides.scales?.y?.ticks || {})
        },

        grid: {
          ...base.scales.y.grid,
          ...(overrides.scales?.y?.grid || {})
        }
      }
    }
  };
}

function applyDatasetDefaults(config) {
  const theme = getChartTheme();

  const palette = [
    theme.primary,
    theme.secondary,
    theme.accent,
    theme.success,
    theme.info,
    '#6f42c1',
    '#d63384'
  ];

  const datasets = config?.data?.datasets;

  if (!Array.isArray(datasets)) {
    return config;
  }

  const type = config.type || 'bar';

  datasets.forEach((dataset, index) => {
    const color = palette[index % palette.length];

    if (!dataset.borderColor) {
      dataset.borderColor = color;
    }

    if (!dataset.backgroundColor) {
      dataset.backgroundColor =
        type === 'line'
          ? hexToRgba(color, 0.12)
          : hexToRgba(color, 0.86);
    }

    if (type === 'bar') {
      dataset.borderWidth ??= 0;
      dataset.borderRadius ??= 8;
      dataset.borderSkipped ??= false;
      dataset.maxBarThickness ??= 44;
      dataset.hoverBackgroundColor ??= color;
    }

    if (type === 'line') {
      dataset.tension ??= 0.34;
      dataset.fill ??= true;
      dataset.borderWidth ??= 2.5;
      dataset.pointRadius ??= 3;
      dataset.pointHoverRadius ??= 6;
      dataset.pointBorderWidth ??= 2;
      dataset.pointBackgroundColor ??= theme.surface;
      dataset.pointBorderColor ??= color;
    }

    if (type === 'doughnut' || type === 'pie') {
      dataset.borderColor ??= theme.surface;
      dataset.borderWidth ??= 3;
      dataset.hoverOffset ??= 8;
    }
  });

  return config;
}

export async function renderChart(canvas, config = {}) {
  if (!canvas) {
    return null;
  }

  const C = await Chart();

  if (canvas.__chart) {
    canvas.__chart.destroy();
    canvas.__chart = null;
  }

  const enhancedConfig = applyDatasetDefaults({
    ...config,

    options: createBaseOptions(config.options || {})
  });

  canvas.__chart = new C(canvas, enhancedConfig);

  return canvas.__chart;
}

export function destroyChart(canvas) {
  if (!canvas?.__chart) {
    return;
  }

  canvas.__chart.destroy();
  canvas.__chart = null;
}

export function updateChart(canvas, data, mode = 'active') {
  const chart = canvas?.__chart;

  if (!chart) {
    return null;
  }

  if (data?.labels) {
    chart.data.labels = data.labels;
  }

  if (data?.datasets) {
    chart.data.datasets = data.datasets;
  }

  applyDatasetDefaults(chart.config);

  chart.update(
    prefersReducedMotion()
      ? 'none'
      : mode
  );

  return chart;
}