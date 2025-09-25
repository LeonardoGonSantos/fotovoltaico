import { useMemo } from 'react'
import { Bar } from 'react-chartjs-2'
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
  type ChartOptions,
  type TooltipItem,
} from 'chart.js'
import type { ResultMonth } from '../../types/domain'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface MonthlyGenerationChartProps {
  data: ResultMonth[]
}

const chartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    y: {
      beginAtZero: true,
      ticks: {
        color: '#334155',
      },
      grid: {
        color: 'rgba(148, 163, 184, 0.25)',
      },
    },
    x: {
      ticks: {
        color: '#475569',
      },
    },
  },
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#1f2937',
        boxWidth: 16,
      },
    },
    tooltip: {
      callbacks: {
        label: (context: TooltipItem<'bar'>) => ` ${context.formattedValue} kWh`,
      },
    },
  },
}

export function MonthlyGenerationChart({ data }: MonthlyGenerationChartProps) {
  const chartData = useMemo(() => {
    return {
      labels: data.map((item) => item.month),
      datasets: [
        {
          label: 'Geração (kWh)',
          data: data.map((item) => Number(item.energyKWh.toFixed(1))),
          backgroundColor: 'rgba(37, 99, 235, 0.6)',
          borderRadius: 6,
        },
        {
          label: 'Limite inferior (kWh)',
          data: data.map((item) => Number(item.uncertaintyLow.toFixed(1))),
          backgroundColor: 'rgba(14, 165, 233, 0.2)',
          borderRadius: 6,
          hidden: true,
        },
        {
          label: 'Limite superior (kWh)',
          data: data.map((item) => Number(item.uncertaintyHigh.toFixed(1))),
          backgroundColor: 'rgba(14, 165, 233, 0.2)',
          borderRadius: 6,
          hidden: true,
        },
      ],
    }
  }, [data])

  return (
    <div style={{ height: 320 }}>
      <Bar data={chartData} options={chartOptions} aria-label="Gráfico de geração mensal" />
    </div>
  )
}
