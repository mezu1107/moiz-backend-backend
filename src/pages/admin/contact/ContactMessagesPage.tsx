// src/pages/admin/contact/ContactMessagesPage.tsx
// FINAL PRODUCTION — DECEMBER 18, 2025

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, Mail, CheckCircle, Clock } from "lucide-react";

import { apiClient } from "@/lib/api";
import { initSocket } from "@/lib/socket";

interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "read" | "replied";
  createdAt: string;
  repliedAt?: string;
}

interface ContactMessagesResponse {
  success: true;
  data: {
    messages: ContactMessage[];
    pagination: {
      total: number;
      page: number;
      pages: number;
      limit: number;
    };
    unreadCount: number;
  };
}

interface NewMessageSocketPayload {
  _id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  unreadCount: number;
}

export default function ContactMessagesPage() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "new" | "read" | "replied"
  >("all");
  const [unreadCount, setUnreadCount] = useState(0);

  /* ===================== FETCH MESSAGES ===================== */
  const { data, isLoading } = useQuery<ContactMessagesResponse>({
    queryKey: ["admin-contact-messages", page, statusFilter],
    queryFn: async () => {
      const url = `/admin/contact/messages?page=${page}&limit=20${
        statusFilter !== "all" ? `&status=${statusFilter}` : ""
      }`;
      return apiClient.get(url);
    },
  });

  /* ===================== MARK AS REPLIED ===================== */
  const markRepliedMutation = useMutation({
    mutationFn: async (id: string) =>
      apiClient.patch(`/admin/contact/messages/${id}/replied`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-contact-messages"] });
      toast.success("Message marked as replied");
    },
    onError: () => toast.error("Failed to mark as replied"),
  });

  /* ===================== SOCKET (REAL-TIME) ===================== */
  useEffect(() => {
    const socket = initSocket();
    if (!socket) return;

    socket.emit("join-admin-room", { role: "admin" });

    socket.on("new-contact-message", (payload: NewMessageSocketPayload) => {
      setUnreadCount(payload.unreadCount);

      toast.info(`New message from ${payload.name}`, {
        description: payload.subject,
        duration: 10000,
        action: {
          label: "View Messages",
          onClick: () => (window.location.href = "/admin/contact"),
        },
      });

      queryClient.invalidateQueries({ queryKey: ["admin-contact-messages"] });
    });

    socket.on("play-notification-sound", () => {
      const audio = new Audio("/sounds/notification-chime.mp3");
      audio.play().catch(() => {});
    });

    return () => {
      socket.off("new-contact-message");
      socket.off("play-notification-sound");
    };
  }, [queryClient]);

  /* ===================== DATA ===================== */
  const responseData = data?.data;
  const messages = responseData?.messages ?? [];
  const pagination = responseData?.pagination;

  useEffect(() => {
    if (responseData?.unreadCount !== undefined) {
      setUnreadCount(responseData.unreadCount);
    }
  }, [responseData?.unreadCount]);

  /* ===================== UI ===================== */
  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black">Contact Messages</h1>
            <p className="text-muted-foreground mt-2">
              Manage customer inquiries and feedback
            </p>
          </div>

          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-lg px-4 py-2">
              <AlertCircle className="mr-2 h-5 w-5" />
              {unreadCount} New Message{unreadCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {(["all", "new", "read", "replied"] as const).map((filter) => (
            <Button
              key={filter}
              variant={statusFilter === filter ? "default" : "outline"}
              onClick={() => {
                setStatusFilter(filter);
                setPage(1);
              }}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </Button>
          ))}
        </div>

        {/* Messages */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Messages</CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center py-20 text-muted-foreground">
                <Mail className="h-20 w-20 mb-4 opacity-50" />
                <p className="text-xl">No messages found</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {messages.map((msg) => (
                      <TableRow key={msg._id}>
                        <TableCell>
                          <p className="font-medium">{msg.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {msg.email}
                          </p>
                        </TableCell>
                        <TableCell>{msg.subject}</TableCell>
                        <TableCell className="truncate max-w-md">
                          {msg.message}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4" />
                            {format(
                              new Date(msg.createdAt),
                              "MMM d, yyyy · h:mm a"
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              msg.status === "new"
                                ? "destructive"
                                : msg.status === "replied"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {msg.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {msg.status !== "replied" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                markRepliedMutation.mutate(msg._id)
                              }
                              disabled={markRepliedMutation.isPending}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Mark Replied
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex justify-center gap-4">
            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              disabled={page === pagination.pages}
              onClick={() =>
                setPage((p) => Math.min(pagination.pages, p + 1))
              }
            >
              Next
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
