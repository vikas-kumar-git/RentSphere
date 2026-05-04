import { useEffect, useMemo, useState } from 'react'
import type { Room, TenantRecord } from '../types'
import {
  deleteRoom as deleteStoredRoom,
  loadRooms as loadStoredRooms,
  saveRoom as saveStoredRoom,
} from '../utils/storage'

function normalizeRoomValue(value: string) {
  return value.trim().toLowerCase()
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage
}

function buildRecordRooms(records: TenantRecord[]): Room[] {
  const rooms = new Map<string, Room>()

  records.forEach((record) => {
    const roomNo = record.roomNo.trim()

    if (!roomNo) {
      return
    }

    const key = normalizeRoomValue(roomNo)
    const existingRoom = rooms.get(key)

    if (existingRoom) {
      if (!existingRoom.tenantName && record.tenantName.trim()) {
        rooms.set(key, { ...existingRoom, tenantName: record.tenantName.trim() })
      }

      return
    }

    rooms.set(key, {
      id: record.roomId || `room-${key}`,
      roomNo,
      tenantName: record.tenantName.trim(),
    })
  })

  return Array.from(rooms.values())
}

export function useRooms(records: TenantRecord[]) {
  const [storedRooms, setStoredRooms] = useState<Room[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [storageError, setStorageError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function hydrateRooms() {
      try {
        setStorageError(null)
        const loadedRooms = await loadStoredRooms()

        if (isMounted) {
          setStoredRooms(loadedRooms)
        }
      } catch (error) {
        if (isMounted) {
          setStorageError(getErrorMessage(error, 'Unable to load rooms from the cloud database.'))
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void hydrateRooms()

    return () => {
      isMounted = false
    }
  }, [])

  const rooms = useMemo(() => {
    const mergedRooms = new Map<string, Room>()

    buildRecordRooms(records).forEach((room) => {
      mergedRooms.set(normalizeRoomValue(room.roomNo), room)
    })

    storedRooms.forEach((room) => {
      mergedRooms.set(normalizeRoomValue(room.roomNo), room)
    })

    return Array.from(mergedRooms.values()).sort((left, right) =>
      left.roomNo.localeCompare(right.roomNo, undefined, { numeric: true }),
    )
  }, [records, storedRooms])

  async function saveRoom(room: Room) {
    try {
      setIsSaving(true)
      setStorageError(null)
      const savedRoom = await saveStoredRoom(room)

      setStoredRooms((currentRooms) => {
        const existingIndex = currentRooms.findIndex((currentRoom) => currentRoom.id === savedRoom.id)

        if (existingIndex > -1) {
          const updated = [...currentRooms]
          updated[existingIndex] = savedRoom
          return updated
        }

        return [savedRoom, ...currentRooms]
      })

      return { ok: true as const, room: savedRoom }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to save the room to the cloud database.')
      setStorageError(message)
      return { ok: false as const, error: message }
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteRoom(id: string) {
    try {
      setIsSaving(true)
      setStorageError(null)
      await deleteStoredRoom(id)
      setStoredRooms((currentRooms) => currentRooms.filter((room) => room.id !== id))
      return { ok: true as const }
    } catch (error) {
      const message = getErrorMessage(error, 'Unable to delete the room from the cloud database.')
      setStorageError(message)
      return { ok: false as const, error: message }
    } finally {
      setIsSaving(false)
    }
  }

  return {
    rooms,
    isLoading,
    isSaving,
    storageError,
    saveRoom,
    deleteRoom,
  }
}
