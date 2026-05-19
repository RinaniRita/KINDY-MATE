from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
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
    pin_configured = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = ['id', 'username', 'email', 'role', 'consent_status', 'avatar_id', 'pin_configured', 'created_at']

    def get_pin_configured(self, obj):
        return bool(obj.parent_pin_hash)


class UserProfileSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8, required=False, allow_blank=True)
    parent_pin = serializers.CharField(write_only=True, min_length=4, max_length=6, required=False, allow_blank=True)

    class Meta:
        model = get_user_model()
        fields = ['id', 'username', 'email', 'role', 'consent_status', 'avatar_id', 'password', 'parent_pin', 'created_at']
        read_only_fields = ['id', 'role', 'consent_status', 'created_at']

    def validate_parent_pin(self, value):
        if value and not value.isdigit():
            raise serializers.ValidationError('Mã PIN chỉ gồm chữ số.')
        return value

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
        parent_pin = validated_data.pop('parent_pin', '')
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        if parent_pin:
            instance.parent_pin_hash = make_password(parent_pin)
        instance.save()
        return instance
