import { useEffect } from "react";
import Swal from "sweetalert2";

type RealtimeNotification = {
  type: string;
  title: string;
  message: string;
  electionId?: number;
  roundId?: number;
  roundNumber?: number;
  createdAt?: string;
  voteData?: Record<string, number>; // candidateId -> voteCount
};

const RealtimeNotifications = () => {
  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: number | undefined;
    let closedByComponent = false;

    const connect = () => {
      const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:8080/notification/ws-notifications-native";
      socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        const notification = JSON.parse(event.data) as RealtimeNotification;
        window.dispatchEvent(new CustomEvent("election-realtime-notification", { detail: notification }));

        // Các type chỉ cập nhật UI, không hiện toast
        const silentTypes = ["VOTE_COUNT_UPDATE", "ROUND_COUNTDOWN", "ROUND_CLOSED", "ELECTION_CLOSED"];
        if (silentTypes.includes(notification.type)) return;

        Swal.fire({
          toast: true,
          position: "top-end",
          icon: notification.type === "ROUND_COUNTDOWN" ? "warning" : "info",
          title: notification.title,
          text: notification.message,
          showConfirmButton: false,
          timer: notification.type === "ROUND_COUNTDOWN" ? 7000 : 5000,
          timerProgressBar: true,
        });
      };

      socket.onclose = () => {
        if (!closedByComponent) {
          reconnectTimer = window.setTimeout(connect, 5000);
        }
      };
    };

    connect();

    return () => {
      closedByComponent = true;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, []);

  return null;
};

export default RealtimeNotifications;
