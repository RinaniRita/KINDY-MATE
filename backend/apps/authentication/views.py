from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.hashers import check_password
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, UserProfileSerializer, UserSerializer


def token_payload(user):
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': UserSerializer(user).data,
    }


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(token_payload(user), status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(request, username=username, password=password)
        if user is None and username:
            matched_user = get_user_model().objects.filter(email=username).first()
            if matched_user:
                user = authenticate(request, username=matched_user.username, password=password)
        if user is None:
            return Response(
                {'detail': 'Tên đăng nhập hoặc mật khẩu chưa đúng.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(token_payload(user))


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data)


class VerifyParentPinView(APIView):
    def post(self, request):
        pin = str(request.data.get('pin', ''))
        if not request.user.parent_pin_hash:
            return Response(
                {'detail': 'Phụ huynh cần thiết lập mã PIN trước khi vào khu trẻ em.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not pin.isdigit() or not check_password(pin, request.user.parent_pin_hash):
            return Response({'detail': 'Mã PIN chưa đúng.'}, status=status.HTTP_400_BAD_REQUEST)
        return Response({'ok': True})
