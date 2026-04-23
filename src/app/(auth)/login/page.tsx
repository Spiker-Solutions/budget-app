"use client";

import { useState } from "react";
import {
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Text,
  Anchor,
  Divider,
  Group,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { notifications } from "@mantine/notifications";
import { IconBrandGoogle } from "@tabler/icons-react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<LoginForm>({
    initialValues: {
      email: "",
      password: "",
    },
    validate: {
      email: (value) =>
        /^\S+@\S+$/.test(value) ? null : "Invalid email address",
      password: (value) =>
        value.length >= 1 ? null : "Password is required",
    },
  });

  const handleSubmit = async (values: LoginForm) => {
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (result?.error) {
        notifications.show({
          title: "Login failed",
          message: result.error,
          color: "red",
        });
      } else {
        router.push("/dashboard");
      }
    } catch {
      notifications.show({
        title: "Error",
        message: "An unexpected error occurred",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack>
        <Text size="lg" fw={500} ta="center">
          Welcome back
        </Text>

        <Button
          leftSection={<IconBrandGoogle size={20} />}
          variant="outline"
          onClick={handleGoogleLogin}
          type="button"
        >
          Continue with Google
        </Button>

        <Divider label="Or continue with email" labelPosition="center" />

        <TextInput
          label="Email"
          placeholder="you@example.com"
          {...form.getInputProps("email")}
        />

        <PasswordInput
          label="Password"
          placeholder="Your password"
          {...form.getInputProps("password")}
        />

        <Button type="submit" loading={loading} fullWidth>
          Sign in
        </Button>

        <Group justify="center">
          <Text size="sm" c="dimmed">
            Don&apos;t have an account?{" "}
            <Anchor component={Link} href="/register" size="sm">
              Sign up
            </Anchor>
          </Text>
        </Group>
      </Stack>
    </form>
  );
}
