from django.contrib import admin
from .models import ChildMascotInventory, MascotItem, RewardItem, RewardTransaction, RewardWallet

admin.site.register(RewardWallet)
admin.site.register(RewardTransaction)
admin.site.register(RewardItem)
admin.site.register(MascotItem)
admin.site.register(ChildMascotInventory)
