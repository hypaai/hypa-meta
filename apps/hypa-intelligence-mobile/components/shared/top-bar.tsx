import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { ArrowLeft, History, UserRound } from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { FONTS } from '@/constants/fonts'
import { withReturnTo } from '@/lib/navigation'
import { GlassIconButton } from '@/components/ui/glass-icon-button'
import { useThemeColors } from '@/hooks/use-theme-color'

type Props = {
  title?: string
  showHistory?: boolean
  showBack?: boolean
  onOpenAccount?: () => void
  historyRoute?: string
  returnTo?: string
}

export function TopBar({
  title = 'Dictionary',
  showHistory = true,
  showBack = false,
  onOpenAccount,
  historyRoute = '/dictionary-history',
  returnTo = '/(dashboard)/dictionary',
}: Props) {
  const router = useRouter()
  const colors = useThemeColors()

  const handleProfile = () => {
    if (onOpenAccount) return onOpenAccount()
    router.push({
      pathname: '/profile',
      params: withReturnTo(returnTo),
    } as any)
  }

  const handleHistory = () => {
    router.push({
      pathname: historyRoute as any,
      params: withReturnTo(returnTo),
    } as any)
  }

  return (
    <View style={styles.container}>
      {showBack ? (
        <GlassIconButton onPress={() => router.back()} fallbackClassName="bg-zinc-100 dark:bg-zinc-900">
          <ArrowLeft size={20} color={colors.icon} />
        </GlassIconButton>
      ) : showHistory ? (
        <GlassIconButton onPress={handleHistory} fallbackClassName="bg-zinc-100 dark:bg-zinc-900">
          <History size={20} color={colors.icon} />
        </GlassIconButton>
      ) : (
        <View style={styles.iconBtnPlaceholder} />
      )}

      <View style={styles.center}>
        <Text style={[styles.titleText, { color: colors.text }]}>{title}</Text>
      </View>

      <GlassIconButton onPress={handleProfile} fallbackClassName="bg-zinc-100 dark:bg-zinc-900">
        <UserRound size={20} color={colors.icon} />
      </GlassIconButton>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingTop: 8,
  },
  iconBtnPlaceholder: { width: 44, height: 44 },
  center: { alignItems: 'center', flex: 1 },
  titleText: { fontSize: 22, fontWeight: '600', fontFamily: FONTS.main.medium },
})
