import notificationSound from '../notificationEffect/noti_sound.mpeg'

const audio = new Audio(notificationSound)

export function playNotificationSound() {
  audio.currentTime = 0
  return audio.play()
}
