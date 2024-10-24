import classNames from 'classnames'
import dayjs from 'dayjs'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import isoWeek from 'dayjs/plugin/isoWeek'
import React, {
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeList as List } from 'react-window'
import { NativeProps, withNativeProps } from '../../utils/native-props'
import { usePropsValue } from '../../utils/use-props-value'
import { mergeProps } from '../../utils/with-default-props'
import { useConfig } from '../config-provider'
import {
  DateRange,
  Page,
  convertPageToDayjs,
  convertValueToRange,
} from './convert'
import useSyncScroll from './useSyncScroll'

dayjs.extend(isoWeek)
dayjs.extend(isSameOrBefore)

const classPrefix = 'adm-calendar-picker-view'

export const Context = React.createContext<{
  visible: boolean
}>({
  visible: false,
})

export type CalendarPickerViewRef = {
  jumpTo: (page: Page | ((page: Page) => Page)) => void
  jumpToToday: () => void
  getDateRange: () => DateRange
}

export type CalendarPickerViewProps = {
  title?: React.ReactNode | false
  confirmText?: string
  weekStartsOn?: 'Monday' | 'Sunday'
  renderTop?: (date: Date) => React.ReactNode
  renderDate?: (date: Date) => React.ReactNode
  renderBottom?: (date: Date) => React.ReactNode
  allowClear?: boolean
  max?: Date
  min?: Date
  shouldDisableDate?: (date: Date) => boolean
} & (
  | {
      selectionMode?: undefined
      value?: undefined
      defaultValue?: undefined
      onChange?: undefined
    }
  | {
      selectionMode: 'single'
      value?: Date | null
      defaultValue?: Date | null
      onChange?: (val: Date | null) => void
    }
  | {
      selectionMode: 'range'
      value?: [Date, Date] | null
      defaultValue?: [Date, Date] | null
      onChange?: (val: [Date, Date] | null) => void
    }
) &
  NativeProps

const defaultProps = {
  weekStartsOn: 'Sunday',
  defaultValue: null,
  allowClear: true,
  usePopup: true,
  selectionMode: 'single',
}

type RowProps = {
  index: number
  style: React.CSSProperties
}

export const CalendarPickerView = forwardRef<
  CalendarPickerViewRef,
  CalendarPickerViewProps
>((p, ref) => {
  const bodyRef = useRef<HTMLDivElement>(null)
  const today = dayjs()
  const props = mergeProps(defaultProps, p)
  const { locale } = useConfig()

  const markItems = [...locale.Calendar.markItems]
  if (props.weekStartsOn === 'Sunday') {
    const item = markItems.pop()
    if (item) markItems.unshift(item)
  }

  const [dateRange, setDateRange] = usePropsValue<DateRange>({
    value:
      props.value === undefined
        ? undefined
        : convertValueToRange(props.selectionMode, props.value),
    defaultValue: convertValueToRange(props.selectionMode, props.defaultValue),
    onChange: v => {
      if (props.selectionMode === 'single') {
        props.onChange?.(v ? v[0] : null)
      } else if (props.selectionMode === 'range') {
        props.onChange?.(v)
      }
    },
  })

  const [intermediate, setIntermediate] = useState(false)

  const [current, setCurrent] = useState(() =>
    dayjs(dateRange ? dateRange[0] : today).date(1)
  )

  const onDateChange = (v: DateRange) => {
    if (v) {
      setCurrent(dayjs(v[0]).date(1))
    }

    setDateRange(v)
  }

  const showHeader = props.title !== false

  // =============================== Scroll ===============================
  const context = useContext(Context)
  const scrollTo = useSyncScroll(current, context.visible, bodyRef)

  // ============================== Boundary ==============================
  // 记录默认的 min 和 max，并在外部的值超出边界时自动扩充
  const [defaultMin, setDefaultMin] = useState(current)
  const [defaultMax, setDefaultMax] = useState(() => current.add(6, 'month'))

  useEffect(() => {
    if (dateRange) {
      const [startDate, endDate] = dateRange
      if (!props.min && startDate && dayjs(startDate).isBefore(defaultMin)) {
        setDefaultMin(dayjs(startDate).date(1))
      }

      if (!props.max && endDate && dayjs(endDate).isAfter(defaultMax)) {
        setDefaultMax(dayjs(endDate).endOf('month'))
      }
    }
  }, [dateRange])

  const maxDay = useMemo(
    () => (props.max ? dayjs(props.max) : defaultMax),
    [props.max, defaultMax]
  )
  const minDay = useMemo(
    () => (props.min ? dayjs(props.min) : defaultMin),
    [props.min, defaultMin]
  )

  // ================================ Refs ================================
  useImperativeHandle(ref, () => ({
    jumpTo: pageOrPageGenerator => {
      let page: Page
      if (typeof pageOrPageGenerator === 'function') {
        page = pageOrPageGenerator({
          year: current.year(),
          month: current.month() + 1,
        })
      } else {
        page = pageOrPageGenerator
      }
      const next = convertPageToDayjs(page)
      setCurrent(next)
      scrollTo(next)
    },
    jumpToToday: () => {
      const next = dayjs().date(1)
      setCurrent(next)
      scrollTo(next)
    },
    getDateRange: () => dateRange,
  }))

  // =============================== Render ===============================
  const header = (
    <div className={`${classPrefix}-header`}>
      <div className={`${classPrefix}-title`}>
        {props.title ?? locale.Calendar.title}
      </div>
    </div>
  )

  function renderBody() {
    const totalMonths = Math.ceil(maxDay.diff(minDay, 'months', true))
    // default 每个月的高度是 344px
    const monthHeight = 344
    const cells: {
      year: number
      month: number
      daysInMonth: number
      monthIterator: dayjs.Dayjs
    }[] = []
    let monthIterator = minDay.clone()

    while (monthIterator.isSameOrBefore(maxDay, 'month')) {
      const year = monthIterator.year()
      const month = monthIterator.month() + 1
      const daysInMonth = monthIterator.daysInMonth()

      cells.push({ year, month, daysInMonth, monthIterator })
      monthIterator = monthIterator.add(1, 'month')
    }

    const Row = ({ index, style }: RowProps) => {
      const { year, month, daysInMonth, monthIterator } = cells[index]

      const renderMap = {
        year,
        month,
      }

      const yearMonth = `${year}-${month}`

      // 获取需要预先填充的空格，如果是 7 天则不需要填充
      const presetEmptyCellCount =
        props.weekStartsOn === 'Monday'
          ? monthIterator.date(1).isoWeekday() - 1
          : monthIterator.date(1).isoWeekday()

      const presetEmptyCells =
        presetEmptyCellCount == 7
          ? null
          : Array.from({ length: presetEmptyCellCount }).map((_, index) => (
              <div key={index} className={`${classPrefix}-cell`}></div>
            ))

      return (
        <div style={style} key={yearMonth} data-year-month={yearMonth}>
          <div className={`${classPrefix}-title`}>
            {locale.Calendar.yearAndMonth?.replace(
              /\${(.*?)}/g,
              (_, variable: keyof typeof renderMap) => {
                return renderMap[variable]?.toString()
              }
            )}
          </div>
          <div className={`${classPrefix}-cells`}>
            {/* 空格填充 */}
            {presetEmptyCells}
            {/* 遍历每月 */}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const d = monthIterator.date(index + 1)
              let isSelect = false
              let isBegin = false
              let isEnd = false
              let isSelectRowBegin = false
              let isSelectRowEnd = false
              if (dateRange) {
                const [begin, end] = dateRange
                isBegin = d.isSame(begin, 'day')
                isEnd = d.isSame(end, 'day')
                isSelect =
                  isBegin ||
                  isEnd ||
                  (d.isAfter(begin, 'day') && d.isBefore(end, 'day'))
                if (isSelect) {
                  isSelectRowBegin =
                    (cells.length % 7 === 0 ||
                      d.isSame(d.startOf('month'), 'day')) &&
                    !isBegin
                  isSelectRowEnd =
                    (cells.length % 7 === 6 ||
                      d.isSame(d.endOf('month'), 'day')) &&
                    !isEnd
                }
              }
              const disabled = props.shouldDisableDate
                ? props.shouldDisableDate(d.toDate())
                : (maxDay && d.isAfter(maxDay, 'day')) ||
                  (minDay && d.isBefore(minDay, 'day'))

              const renderTop = () => {
                const top = props.renderTop?.(d.toDate())

                if (top) {
                  return top
                }

                if (props.selectionMode === 'range') {
                  if (isBegin) {
                    return locale.Calendar.start
                  }

                  if (isEnd) {
                    return locale.Calendar.end
                  }
                }

                if (d.isSame(today, 'day') && !isSelect) {
                  return locale.Calendar.today
                }
              }
              return (
                <div
                  key={d.valueOf()}
                  className={classNames(`${classPrefix}-cell`, {
                    [`${classPrefix}-cell-today`]: d.isSame(today, 'day'),
                    [`${classPrefix}-cell-selected`]: isSelect,
                    [`${classPrefix}-cell-selected-begin`]: isBegin,
                    [`${classPrefix}-cell-selected-end`]: isEnd,
                    [`${classPrefix}-cell-selected-row-begin`]:
                      isSelectRowBegin,
                    [`${classPrefix}-cell-selected-row-end`]: isSelectRowEnd,
                    [`${classPrefix}-cell-disabled`]: !!disabled,
                  })}
                  onClick={() => {
                    if (!props.selectionMode) return
                    if (disabled) return
                    const date = d.toDate()
                    function shouldClear() {
                      if (!props.allowClear) return false
                      if (!dateRange) return false
                      const [begin, end] = dateRange
                      return d.isSame(begin, 'date') && d.isSame(end, 'day')
                    }
                    if (props.selectionMode === 'single') {
                      if (props.allowClear && shouldClear()) {
                        onDateChange(null)
                        return
                      }
                      onDateChange([date, date])
                    } else if (props.selectionMode === 'range') {
                      if (!dateRange) {
                        onDateChange([date, date])
                        setIntermediate(true)
                        return
                      }
                      if (shouldClear()) {
                        onDateChange(null)
                        setIntermediate(false)
                        return
                      }
                      if (intermediate) {
                        const another = dateRange[0]
                        onDateChange(
                          another > date ? [date, another] : [another, date]
                        )
                        setIntermediate(false)
                      } else {
                        onDateChange([date, date])
                        setIntermediate(true)
                      }
                    }
                  }}
                >
                  <div className={`${classPrefix}-cell-top`}>{renderTop()}</div>
                  <div className={`${classPrefix}-cell-date`}>
                    {props.renderDate ? props.renderDate(d.toDate()) : d.date()}
                  </div>
                  <div className={`${classPrefix}-cell-bottom`}>
                    {props.renderBottom?.(d.toDate())}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )
    }

    return (
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={totalMonths}
            itemSize={monthHeight}
            width={width}
            className={`${classPrefix}-no-scrollbar`}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    )
  }
  const body = (
    <div className={`${classPrefix}-body`} ref={bodyRef}>
      {renderBody()}
    </div>
  )

  const mark = (
    <div className={`${classPrefix}-mark`}>
      {markItems.map((item, index) => (
        <div key={index} className={`${classPrefix}-mark-cell`}>
          {item}
        </div>
      ))}
    </div>
  )

  return withNativeProps(
    props,
    <div className={classPrefix}>
      {showHeader && header}
      {mark}
      {body}
    </div>
  )
})
