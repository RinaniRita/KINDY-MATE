from django.contrib.auth import get_user_model
from rest_framework import serializers


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = get_user_model()
        fields = ['id', 'username', 'email', 'password', 'role', 'consent_status', 'avatar_id', 'created_at']
        read_only_fields = ['id', 'role', 'created_at']

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = get_user_model()(**validated_data)
        user.role = get_user_model().Role.PARENT
        user.set_password(password)
        user.save()
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = get_user_model()
        fields = ['id', 'username', 'email', 'role', 'consent_status', 'avatar_id', 'created_at']


class UserProfileSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=False, allow_blank=True)

    class Meta:
        model = get_user_model()
        fields = ['id', 'username', 'email', 'role', 'consent_status', 'avatar_id', 'password', 'created_at']
        read_only_fields = ['id', 'role', 'consent_status', 'created_at']

    def validate_username(self, value):
        qs = get_user_model().objects.filter(username=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Tên đăng nhập này đã được sử dụng.')
        return value

    def validate_email(self, value):
        qs = get_user_model().objects.filter(email=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('Email này đã được sử dụng.')
        return value

    def update(self, instance, validated_data):
        password = validated_data.pop('password', '')
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
