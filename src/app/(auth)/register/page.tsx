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

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<RegisterForm>({
    initialValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validate: {
      name: (value) =>
        value.length >= 1 ? null : "Name is required",
      email: (value) =>
        /^\S+@\S+$/.test(value) ? null : "Invalid email address",
      password: (value) =>
        value.length >= 8 ? null : "Password must be at least 8 characters",
      confirmPassword: (value, values) =>
        value === values.password ? null : "Passwords do not match",
    },
  });

  const handleSubmit = async (values: RegisterForm) => {
    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          email: values.email,
          password: values.password,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        notifications.show({
          title: "Registration failed",
          message: result.error,
          color: "red",
        });
        return;
      }

      const signInResult = await signIn("credentials", {
        email: values.email,
        password: values.password,
        redirect: false,
      });

      if (signInResult?.error) {
        notifications.show({
          title: "Account created",
          message: "Please sign in with your new account",
          color: "green",
        });
        router.push("/login");
      } else {
        notifications.show({
          title: "Welcome!",
          message: "Your account has been created successfully",
          color: "green",
        });
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
          Create your account
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
          label="Name"
          placeholder="Your name"
          {...form.getInputProps("name")}
        />

        <TextInput
          label="Email"
          placeholder="you@example.com"
          {...form.getInputProps("email")}
        />

        <PasswordInput
          label="Password"
          placeholder="Create a password"
          {...form.getInputProps("password")}
        />

        <PasswordInput
          label="Confirm Password"
          placeholder="Confirm your password"
          {...form.getInputProps("confirmPassword")}
        />

        <Button type="submit" loading={loading} fullWidth>
          Create account
        </Button>

        <Group justify="center">
          <Text size="sm" c="dimmed">
            Already have an account?{" "}
            <Anchor component={Link} href="/login" size="sm">
              Sign in
            </Anchor>
          </Text>
        </Group>
      </Stack>
    </form>
  );
}
