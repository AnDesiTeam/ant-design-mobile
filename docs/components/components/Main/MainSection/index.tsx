import React, { useState, useEffect } from 'react'
import { Button } from 'antd'
import Lottie from 'react-lottie'
import styles from './index.local.less'
import { useTrans } from '../../../../hooks/useTrans'

export default () => {
  const [startFireAnimation, setStartFireAnimation] = useState(false)
  const [startResultAnimation, setStartResultAnimation] = useState(false)
  const [isWidthScreen, setIsWidthScreen] = useState(true)

  const trans = useTrans()

  useEffect(() => {
    setIsWidthScreen(screen?.width > 450)
    document
      .querySelector('#calendarImage')
      ?.addEventListener('mouseenter', () => {
        setStartFireAnimation(true)
      })
    document
      .querySelector('#resultImage')
      ?.addEventListener('mouseenter', () => {
        setStartResultAnimation(true)
      })
  }, [])

  useEffect(() => {
    const myObserver = new ResizeObserver(entries => {
      const myContainer = entries?.[0]
      if (myContainer.contentRect.width > 450) {
        setIsWidthScreen(true)
      } else {
        setIsWidthScreen(false)
      }
    })

    const container = document.querySelector('#mainContainer') as Element
    if (container) {
      myObserver.observe(container)
    }
    return () => {
      myObserver.disconnect()
    }
  }, [])

  return (
    <div className={styles.mainSectionContainer}>
      <div>
        <div className={styles.mainSectionTitle}>Ant Design Mobile</div>
        <div className={styles.mainSectionDescription}>
          {trans(
            'Research the final experience of mobile',
            '探索移动端 Web 的体验极限'
          )}
        </div>
        <div className={styles.mainSectionButtonAction}>
          <Button
            shape='round'
            className={styles.buttonLeft}
            href={trans('/guide/quick-start', '/zh/guide/quick-start')}
          >
            {trans('Get Start', '开始使用')}
          </Button>
          <Button
            shape='round'
            className={styles.buttonRight}
            href={trans('/components', '/zh/components')}
          >
            {trans('Preview Online', '在线体验')}
          </Button>
        </div>
      </div>
      <div className={styles.imageContainer}>
        <div
          className={styles.calendarImage}
          id='calendarImage'
          style={{
            backgroundImage: trans.en
              ? 'url(https://gw.alipayobjects.com/zos/bmw-prod/d3df264c-7e0a-4ae8-b8e6-5bdd29c9d51e.svg)'
              : 'url(https://gw.alipayobjects.com/zos/bmw-prod/42b45d98-e52f-43d5-89ed-47b13f7cd35f.svg)',
          }}
        >
          <div className={styles.publishDayAnimation}>
            <Lottie
              options={{
                loop: false,
                autoplay: false,
                path: trans.en
                  ? 'https://gw.alipayobjects.com/os/finxbff/lolita/1fde335f-a603-4594-b253-5fd23198a370/lottie.json'
                  : 'https://gw.alipayobjects.com/os/finxbff/lolita/a31c67dd-ac41-4ca6-a92b-3e459e2035af/lottie.json',
              }}
              eventListeners={[
                {
                  eventName: 'complete',
                  callback: () => {
                    setStartFireAnimation(false)
                  },
                },
              ]}
              height={startFireAnimation ? (isWidthScreen ? 280 : 172) : 0}
              width={startFireAnimation ? (isWidthScreen ? 280 : 172) : 0}
              isStopped={!startFireAnimation}
              style={{ pointerEvents: 'none' }}
            />
          </div>
        </div>
        <div className={styles.resultImage} id='resultImage'>
          <Lottie
            options={{
              loop: false,
              autoplay: false,
              path: 'https://gw.alipayobjects.com/os/finxbff/lolita/01548f7e-9c13-4110-8023-f664ef4736c4/lottie.json',
            }}
            eventListeners={[
              {
                eventName: 'complete',
                callback: () => {
                  setStartResultAnimation(false)
                },
              },
            ]}
            height={isWidthScreen ? 117 : 70}
            width={isWidthScreen ? 94 : 56}
            isStopped={!startResultAnimation}
            style={{ pointerEvents: 'none' }}
          />
        </div>
        <img
          className={styles.staticImage}
          src={
            isWidthScreen
              ? 'https://gw.alipayobjects.com/mdn/rms_226d75/afts/img/A*kQ_zRK8YuGoAAAAAAAAAAAAAARQnAQ'
              : 'https://gw.alipayobjects.com/mdn/rms_226d75/afts/img/A*v4isTYsMCNcAAAAAAAAAAAAAARQnAQ'
          }
        ></img>
      </div>
    </div>
  )
}
